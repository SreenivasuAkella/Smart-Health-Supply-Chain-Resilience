import React from 'react';
import MainLayout from '../../components/MainLayout';

export function generateStaticParams() {
  return [
    { tab: 'overview' },
    { tab: 'clinical' },
    { tab: 'map' },
    { tab: 'inventory' },
    { tab: 'forecasting' },
    { tab: 'coldchain' },
    { tab: 'cloud-data' },
    { tab: 'federated' },
    { tab: 'simulation' },
    { tab: 'vision' },
    { tab: 'voice' },
    { tab: 'settings' }
  ];
}

export default function TabPage({ params }) {
  const tab = params?.tab || 'overview';
  return <MainLayout initialTab={tab} />;
}
