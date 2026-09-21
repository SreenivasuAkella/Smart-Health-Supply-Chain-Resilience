from fastapi import APIRouter, HTTPException, Header, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from ..services.auth_service import auth_service
from ..config import ADMIN_SECRET_KEY_B64

router = APIRouter(prefix="/api/auth", tags=["Authentication & Access Control"])

security_bearer = HTTPBearer(auto_error=False)


# --- Request & Response Models ---

class LoginRequest(BaseModel):
    email: str = Field(..., description="Healthcare official registered email address")
    password: str = Field(..., min_length=6, description="User password")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Active JWT Refresh Token")


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = Field(None, description="Active JWT Refresh Token to revoke")


class RegisterUserRequest(BaseModel):
    email: str = Field(..., description="New personnel email address")
    password: str = Field(..., min_length=6, description="Initial temporary or permanent password")
    full_name: str = Field(..., description="Full name of healthcare personnel")
    role: Optional[str] = Field("PHC_OFFICER", description="Grid role: NATIONAL_DIRECTOR, PHC_OFFICER, LOGISTICS_COORDINATOR, SURVEILLANCE_EPIDEMIOLOGIST")
    department: Optional[str] = Field("Public Health & Family Welfare", description="Affiliated department")
    assigned_state: Optional[str] = Field("National", description="Assigned state/territory")
    assigned_district: Optional[str] = Field(None, description="Assigned administrative district")


# --- Dependency: Current Authenticated User ---

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> Dict[str, Any]:
    """
    Extracts and verifies JWT Bearer Access Token from request header.
    Raises HTTP 401 if token is expired, invalid, or user does not exist.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    try:
        payload = auth_service.verify_access_token(token)
        user_id = payload.get("sub")
        user = auth_service.find_user_by_id(user_id)
        if not user or user.get("status") != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is deactivated or not found.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return auth_service._safe_user_dict(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )


def require_role(allowed_roles: List[str]):
    """Role-based authorization dependency guard enforcing role locks and returning code 4007."""
    async def role_checker(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
    ) -> Dict[str, Any]:
        allowed_upper = [r.upper() for r in allowed_roles]
        if not credentials or not credentials.credentials:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing authorization token. Requires one of roles {allowed_roles}."
            )
        try:
            payload = auth_service.verify_access_token(credentials.credentials)
            user_role = str(payload.get("role", "")).upper()
            if user_role not in allowed_upper:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Role '{user_role}' is not authorized. Requires one of {allowed_roles}."
                )
            return payload
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Invalid or expired token. Requires one of {allowed_roles}."
            )
    return role_checker


# --- Auth Endpoints ---

@router.post("/login", summary="Sign in with email and password")
async def login(body: LoginRequest):
    """
    Authenticates healthcare personnel credentials.
    Issues a short-lived JWT Access Token (15 min) and long-lived JWT Refresh Token (7 days).
    Refresh tokens are recorded in Firebase RTDB table `auth/refresh_tokens/{jti}`.
    """
    user = auth_service.authenticate_user(body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your email and password."
        )

    access_token, expires_in = auth_service.create_access_token(user)
    refresh_token = auth_service.create_refresh_token(user)

    data_payload = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "user": user
    }

    return {
        "data": data_payload,
        "status": {
            "code": 2000,
            "message": "Success"
        }
    }


@router.post("/refresh", summary="Rotate and refresh JWT Access Token")
async def refresh_token(body: RefreshTokenRequest):
    """
    Exchanges an active refresh token for a brand new Access Token and Refresh Token pair.
    Revokes the old refresh token in Firebase RTDB (Token Rotation pattern).
    """
    try:
        new_access, new_refresh, expires_in, user = auth_service.rotate_refresh_token(body.refresh_token)
        data_payload = {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "bearer",
            "expires_in": expires_in,
            "user": user
        }
        return {
            "data": data_payload,
            "status": {
                "code": 2000,
                "message": "Success"
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Refresh token error: {str(e)}"
        )


@router.post("/logout", summary="Revoke session and refresh token")
async def logout(body: Optional[LogoutRequest] = None):
    """
    Invalidates the active refresh token in Firebase RTDB.
    """
    if body and body.refresh_token:
        auth_service.revoke_refresh_token(body.refresh_token)
    return {
        "data": "Session invalidated successfully.",
        "status": {
            "code": 2000,
            "message": "Success"
        }
    }


@router.get("/me", summary="Get current authenticated user profile")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the authenticated user's profile verified from JWT access token.
    """
    return {
        "data": current_user,
        "status": {
            "code": 2000,
            "message": "Success"
        }
    }


def get_cached_india_geography() -> Dict[str, List[str]]:
    """Loads and caches valid states and districts from the database."""
    import os, json
    from ..config import BASE_DIR
    districts_file = os.path.join(BASE_DIR, "app", "data", "india_districts.json")
    try:
        with open(districts_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        mapping = {}
        for item in data:
            s = item.get("state")
            d = item.get("district")
            if s and d:
                mapping.setdefault(s, set()).add(d)
        return {s: sorted(list(dist_set)) for s, dist_set in sorted(mapping.items())}
    except Exception:
        return {}


@router.get("/geography", summary="Get all database-registered Indian States and Districts")
async def get_geography():
    """
    Returns valid states and their respective districts strictly from the database.
    Used for searchable dropdowns in personnel provisioning.
    """
    mapping = get_cached_india_geography()
    geo_data = {
        "states": sorted(list(mapping.keys())),
        "districts_by_state": mapping
    }
    return {
        "data": geo_data,
        "status": {
            "code": 2000,
            "message": "Success"
        }
    }


@router.post("/register", status_code=status.HTTP_201_CREATED, summary="Provision an email into Firebase tables with Base64 Secret Key")
async def register_user_with_secret(
    body: RegisterUserRequest,
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    request: Request = None
):
    """
    SECURE REGISTRATION ENDPOINT (NO PUBLIC SIGNUP).
    Accounts can ONLY be created by presenting the valid Base64 Admin Secret Key in:
      - Header `X-Admin-Secret: <base64_secret>` OR
      - Header `Authorization: Bearer <base64_secret>`

    Strictly validates State and District against database records based on role.
    """
    candidate_secret = x_admin_secret

    if not candidate_secret and authorization:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            candidate_secret = parts[1]

    # Verify Base64 Secret Key
    if not candidate_secret or not auth_service.verify_admin_secret(candidate_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing Base64 Admin Secret Key. Public signups are strictly disabled."
        )

    role_upper = (body.role or "PHC_OFFICER").upper().strip()
    assigned_state = (body.assigned_state or "").strip()
    assigned_district = (body.assigned_district or "").strip() if body.assigned_district else None

    # Enforce geographic validity from database according to role
    if role_upper == "NATIONAL_DIRECTOR":
        assigned_state = "All India Grid"
        assigned_district = "All Districts (National)"
    else:
        geo = get_cached_india_geography()
        if not assigned_state or assigned_state not in geo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid State: '{assigned_state}' does not exist in India database."
            )
        valid_districts = geo[assigned_state]
        if not assigned_district or assigned_district not in valid_districts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid District: '{assigned_district}' does not exist in State '{assigned_state}' in database."
            )

    try:
        new_user = auth_service.register_user(
            email=body.email,
            password=body.password,
            full_name=body.full_name,
            role=role_upper,
            department=body.department or "Public Health Grid",
            assigned_state=assigned_state,
            assigned_district=assigned_district,
            created_by="BASE64_ADMIN_SECRET_API"
        )
        msg = f"Personnel email '{body.email}' successfully provisioned in Firebase tables."
        return {
            "data": {
                "user": new_user,
                "message": msg,
                "firebase_table": f"auth/users/{new_user['user_id']}"
            },
            "status": {
                "code": 2000,
                "message": "Success"
            }
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/users", summary="List provisioned healthcare personnel in grid")
async def list_registered_users(
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
):
    """
    Lists provisioned users. Accessible either by Base64 Admin Secret Key or
    by an authenticated user with NATIONAL_DIRECTOR role.
    """
    is_authorized = False

    # Check Base64 Secret
    if x_admin_secret and auth_service.verify_admin_secret(x_admin_secret):
        is_authorized = True
    elif credentials and credentials.credentials:
        try:
            payload = auth_service.verify_access_token(credentials.credentials)
            if payload.get("role") == "NATIONAL_DIRECTOR":
                is_authorized = True
        except Exception:
            pass

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin privileges or Base64 Admin Secret Key required."
        )

    users = auth_service.list_users()
    return {
        "status": "success",
        "total_users": len(users),
        "users": users
    }
