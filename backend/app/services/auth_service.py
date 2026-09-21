import os
import json
import base64
import uuid
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
import jwt

from ..config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    ADMIN_SECRET_KEY_B64
)
from .firebase_service import firebase_service


def hash_password(password: str) -> str:
    """Securely hashes a password using PBKDF2-HMAC-SHA256 with a cryptographically random salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}${key.hex()}"


def verify_password(stored_hash: str, provided_password: str) -> bool:
    """Verifies a password against the stored PBKDF2 hash using constant-time comparison."""
    try:
        parts = stored_hash.split("$")
        if len(parts) != 2:
            return False
        salt = bytes.fromhex(parts[0])
        original_key = bytes.fromhex(parts[1])
        new_key = hashlib.pbkdf2_hmac("sha256", provided_password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(original_key, new_key)
    except Exception:
        return False


ROLE_SCOPES: Dict[str, List[str]] = {
    "NATIONAL_DIRECTOR": [
        "overview", "map", "inventory", "forecasting", "coldchain",
        "federated", "simulation", "vision", "voice", "attendance", "analytics", "admin:all"
    ],
    "PHC_OFFICER": [
        "overview", "map", "inventory", "coldchain", "vision", "voice", "attendance"
    ],
    "LOGISTICS_COORDINATOR": [
        "overview", "map", "inventory", "coldchain", "simulation", "voice"
    ],
    "SURVEILLANCE_EPIDEMIOLOGIST": [
        "overview", "map", "forecasting", "federated", "simulation", "voice", "analytics"
    ]
}


class AuthService:
    """
    Enterprise Authentication Service for Sanjeevani AI.
    Synchronizes user profiles and refresh token audit tables directly with Firebase Realtime Database
    (tables: auth/users and auth/refresh_tokens). Pure cloud database integration with zero local file mirrors.
    """

    def __init__(self):
        self.jwt_secret = JWT_SECRET_KEY
        self.jwt_algorithm = JWT_ALGORITHM
        self.access_expire_min = ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_expire_days = REFRESH_TOKEN_EXPIRE_DAYS
        self.admin_secret_b64 = ADMIN_SECRET_KEY_B64

        self._users: Dict[str, Dict[str, Any]] = {}
        self._refresh_tokens: Dict[str, Dict[str, Any]] = {}

        self._sync_from_firebase()
        self.bootstrap_admin_if_needed()

    def _sync_from_firebase(self):
        """Loads user tables and refresh token tables directly from Firebase RTDB."""
        try:
            remote_users = firebase_service.read_data("auth/users")
            if remote_users and isinstance(remote_users, dict):
                self._users.update(remote_users)

            remote_tokens = firebase_service.read_data("auth/refresh_tokens")
            if remote_tokens and isinstance(remote_tokens, dict):
                self._refresh_tokens.update(remote_tokens)
        except Exception as e:
            print(f"[Auth Firebase Remote Sync Notice]: {e}")

    def verify_admin_secret(self, candidate_secret: str) -> bool:
        """
        Validates the Base64 secret key provided in the authorization/header.
        Accepts either the exact Base64 string or the decoded equivalent.
        """
        if not candidate_secret:
            return False

        clean_candidate = candidate_secret.strip()
        expected_b64 = self.admin_secret_b64.strip()

        # Direct constant-time comparison
        if hmac.compare_digest(clean_candidate, expected_b64):
            return True

        # Decode comparison in case padding or encoding variations occur
        try:
            cand_decoded = base64.b64decode(clean_candidate).decode("utf-8", errors="ignore").strip()
            exp_decoded = base64.b64decode(expected_b64).decode("utf-8", errors="ignore").strip()
            if cand_decoded and exp_decoded and hmac.compare_digest(cand_decoded, exp_decoded):
                return True
        except Exception:
            pass

        return False

    def bootstrap_admin_if_needed(self):
        """Ensures Superadmin (Sreenivasu) and administrator accounts exist in Firebase tables."""
        now_iso = datetime.utcnow().isoformat() + "Z"

        # 1. Apex Superadmin (Sreenivasu)
        superadmin_email = "superadmin@sanjeevani.gov.in"
        exists_super = any(u.get("email", "").lower() == superadmin_email for u in self._users.values())
        if not exists_super:
            super_id = "usr_superadmin_000"
            super_record = {
                "user_id": super_id,
                "email": superadmin_email,
                "password_hash": hash_password("AdminSanjeevani@123"),
                "full_name": "Sreenivasu",
                "role": "NATIONAL_DIRECTOR",
                "department": "Apex National Command",
                "assigned_state": "All India Grid",
                "status": "ACTIVE",
                "created_at": now_iso,
                "created_by": "SYSTEM_BOOTSTRAP"
            }
            self._users[super_id] = super_record
            firebase_service.write_data(f"auth/users/{super_id}", super_record)

        # 2. National Health Director
        admin_email = "admin@sanjeevani.gov.in"
        exists = any(u.get("email", "").lower() == admin_email for u in self._users.values())
        if not exists:
            admin_id = "usr_admin_001"
            admin_record = {
                "user_id": admin_id,
                "email": admin_email,
                "password_hash": hash_password("Sanjeevani@2026"),
                "full_name": "Dr. Rajeshwar Rao",
                "role": "NATIONAL_DIRECTOR",
                "department": "Ministry of Health & Family Welfare",
                "assigned_state": "All India Grid",
                "status": "ACTIVE",
                "created_at": now_iso,
                "created_by": "SYSTEM_BOOTSTRAP"
            }
            self._users[admin_id] = admin_record
            firebase_service.write_data(f"auth/users/{admin_id}", admin_record)

        # 3. Operational PHC Officer
        phc_email = "officer.pune@sanjeevani.gov.in"
        exists_phc = any(u.get("email", "").lower() == phc_email for u in self._users.values())
        if not exists_phc:
            phc_id = "usr_phc_pune_002"
            phc_record = {
                "user_id": phc_id,
                "email": phc_email,
                "password_hash": hash_password("PHCOfficer@2026"),
                "full_name": "Dr. Kavita Deshmukh",
                "role": "PHC_OFFICER",
                "department": "District Health Surveillance Unit",
                "assigned_state": "Maharashtra",
                "assigned_district": "Pune",
                "status": "ACTIVE",
                "created_at": now_iso,
                "created_by": "SYSTEM_BOOTSTRAP"
            }
            self._users[phc_id] = phc_record
            firebase_service.write_data(f"auth/users/{phc_id}", phc_record)

    def find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        clean = email.strip().lower()
        for user in self._users.values():
            if user.get("email", "").lower() == clean:
                return user
        # Check direct lookup from Firebase RTDB in case another instance wrote it
        remote_users = firebase_service.read_data("auth/users")
        if remote_users and isinstance(remote_users, dict):
            for user in remote_users.values():
                if isinstance(user, dict) and user.get("email", "").lower() == clean:
                    uid = user.get("user_id")
                    if isinstance(uid, str) and uid:
                        self._users[uid] = user
                    return user
        return None

    def find_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if user_id in self._users:
            return self._users[user_id]
        # Fallback fetch from Firebase RTDB
        remote_user = firebase_service.read_data(f"auth/users/{user_id}")
        if remote_user and isinstance(remote_user, dict):
            self._users[user_id] = remote_user
            return remote_user
        return None

    def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
        role: str = "PHC_OFFICER",
        department: str = "Public Health Grid",
        assigned_state: str = "National",
        assigned_district: Optional[str] = None,
        created_by: str = "ADMIN_API_KEY"
    ) -> Dict[str, Any]:
        """
        Registers a new email directly into Firebase RTDB auth/users table.
        Caller MUST verify admin base64 secret key prior to invoking.
        """
        clean_email = email.strip().lower()
        if self.find_user_by_email(clean_email):
            raise ValueError(f"User with email '{clean_email}' is already registered in Sanjeevani Grid.")

        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.utcnow().isoformat() + "Z"
        pwd_hash = hash_password(password)

        user_record = {
            "user_id": user_id,
            "email": clean_email,
            "password_hash": pwd_hash,
            "full_name": full_name.strip(),
            "role": role.strip().upper(),
            "department": department.strip(),
            "assigned_state": assigned_state.strip(),
            "assigned_district": assigned_district.strip() if assigned_district else None,
            "status": "ACTIVE",
            "created_at": now_iso,
            "created_by": created_by
        }

        # 1. Update in-memory index
        self._users[user_id] = user_record

        # 2. Write directly to Firebase RTDB table: auth/users/{user_id}
        firebase_service.write_data(f"auth/users/{user_id}", user_record)

        # Return safe profile (exclude password hash)
        return self._safe_user_dict(user_record)

    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Validates email and password, updating last_login timestamp."""
        user = self.find_user_by_email(email)
        if not user:
            return None

        if user.get("status") != "ACTIVE":
            return None

        stored_hash = user.get("password_hash", "")
        if not verify_password(stored_hash, password):
            return None

        now_iso = datetime.utcnow().isoformat() + "Z"
        user["last_login"] = now_iso
        firebase_service.write_data(f"auth/users/{user['user_id']}/last_login", now_iso)

        return self._safe_user_dict(user)


    def create_access_token(self, user: Dict[str, Any]) -> Tuple[str, int]:
        """Generates a short-lived JWT Access Token (default: 15 minutes) with role and scope claims."""
        expires_delta = timedelta(minutes=self.access_expire_min)
        expire_at = datetime.utcnow() + expires_delta
        expires_in_seconds = int(expires_delta.total_seconds())

        role = str(user.get("role", "PHC_OFFICER")).upper()
        scopes = ROLE_SCOPES.get(role, ["overview"])
        scope_str = " ".join(scopes)

        payload = {
            "sub": user["user_id"],
            "email": user["email"],
            "role": role,
            "scope": scope_str,
            "scopes": scopes,
            "assigned_state": user.get("assigned_state", "All India Grid"),
            "assigned_district": user.get("assigned_district"),
            "full_name": user.get("full_name", ""),
            "jti": str(uuid.uuid4()),
            "type": "access",
            "iat": datetime.utcnow(),
            "exp": expire_at
        }
        token = jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
        return token, expires_in_seconds

    def create_refresh_token(self, user: Dict[str, Any]) -> str:
        """
        Generates a long-lived JWT Refresh Token (default: 7 days) and records it
        directly in Firebase RTDB auth/refresh_tokens table for revocation capability.
        """
        jti = str(uuid.uuid4())
        expires_delta = timedelta(days=self.refresh_expire_days)
        expire_at = datetime.utcnow() + expires_delta
        now_iso = datetime.utcnow().isoformat() + "Z"
        expire_iso = expire_at.isoformat() + "Z"

        payload = {
            "sub": user["user_id"],
            "email": user["email"],
            "jti": jti,
            "type": "refresh",
            "iat": datetime.utcnow(),
            "exp": expire_at
        }
        token = jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

        token_record = {
            "jti": jti,
            "user_id": user["user_id"],
            "email": user["email"],
            "created_at": now_iso,
            "expires_at": expire_iso,
            "revoked": False
        }

        # Store directly in Firebase table: auth/refresh_tokens/{jti}
        self._refresh_tokens[jti] = token_record
        firebase_service.write_data(f"auth/refresh_tokens/{jti}", token_record)

        return token

    def verify_access_token(self, token: str) -> Dict[str, Any]:
        """Decodes and validates a JWT access token."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            if payload.get("type") != "access":
                raise ValueError("Token is not an access token")
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Access token has expired")
        except Exception as e:
            raise ValueError(f"Invalid access token: {str(e)}")

    def verify_refresh_token(self, token: str) -> Dict[str, Any]:
        """Decodes refresh token and checks Firebase RTDB table to verify it is active and not revoked."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            if payload.get("type") != "refresh":
                raise ValueError("Token is not a refresh token")

            jti = payload.get("jti")
            if not jti:
                raise ValueError("Token missing jti claim")

            # Check Firebase RTDB table for revocation
            record = self._refresh_tokens.get(jti)
            if not record:
                remote = firebase_service.read_data(f"auth/refresh_tokens/{jti}")
                if remote and isinstance(remote, dict):
                    record = remote
                    self._refresh_tokens[jti] = remote

            if not record:
                raise ValueError("Refresh token record not found in system")

            if record.get("revoked", False):
                raise ValueError("Refresh token has been revoked")

            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Refresh token has expired")
        except Exception as e:
            raise ValueError(f"Invalid refresh token: {str(e)}")

    def rotate_refresh_token(self, old_refresh_token: str) -> Tuple[str, str, int, Dict[str, Any]]:
        """
        Performs Refresh Token Rotation:
        1. Validates the old refresh token.
        2. Revokes the old refresh token in Firebase RTDB table.
        3. Issues a fresh Access Token and a fresh Refresh Token.
        4. Returns (new_access_token, new_refresh_token, expires_in, safe_user).
        """
        payload = self.verify_refresh_token(old_refresh_token)
        old_jti = payload["jti"]
        user_id = payload["sub"]

        # Revoke old token directly in Firebase table
        if old_jti in self._refresh_tokens:
            self._refresh_tokens[old_jti]["revoked"] = True
            self._refresh_tokens[old_jti]["revoked_at"] = datetime.utcnow().isoformat() + "Z"
        firebase_service.write_data(f"auth/refresh_tokens/{old_jti}/revoked", True)

        user = self.find_user_by_id(user_id)
        if not user or user.get("status") != "ACTIVE":
            raise ValueError("User account is inactive or not found")

        safe_user = self._safe_user_dict(user)
        new_access_token, expires_in = self.create_access_token(safe_user)
        new_refresh_token = self.create_refresh_token(safe_user)

        return new_access_token, new_refresh_token, expires_in, safe_user

    def revoke_refresh_token(self, token: str) -> bool:
        """Revokes a refresh token during user logout directly in Firebase table."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm], options={"verify_exp": False})
            jti = payload.get("jti")
            if jti:
                if jti in self._refresh_tokens:
                    self._refresh_tokens[jti]["revoked"] = True
                    self._refresh_tokens[jti]["revoked_at"] = datetime.utcnow().isoformat() + "Z"
                firebase_service.write_data(f"auth/refresh_tokens/{jti}/revoked", True)
                return True
        except Exception:
            pass
        return False

    def list_users(self) -> List[Dict[str, Any]]:
        """Returns all safe user profiles in the grid directly from Firebase table index."""
        return [self._safe_user_dict(u) for u in self._users.values()]

    def _safe_user_dict(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Strips sensitive password hashes before returning user profile."""
        role = str(user.get("role", "PHC_OFFICER")).upper()
        scopes = ROLE_SCOPES.get(role, ["overview"])
        return {
            "user_id": user.get("user_id"),
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "role": role,
            "scope": " ".join(scopes),
            "scopes": scopes,
            "department": user.get("department"),
            "assigned_state": user.get("assigned_state"),
            "assigned_district": user.get("assigned_district"),
            "status": user.get("status"),
            "created_at": user.get("created_at"),
            "last_login": user.get("last_login")
        }


auth_service = AuthService()
