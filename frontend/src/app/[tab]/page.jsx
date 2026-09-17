import React from 'react';
import MainLayout from '../../components/MainLayout';

export function generateStaticParams() {
  return [
    { tab: 'overview' },
    { tab: 'map' },
    { tab: 'inventory' },
    { tab: 'forecasting' },
    { tab: 'coldchain' },
    { tab: 'federated' },
    { tab: 'simulation' },
    { tab: 'vision' },
    { tab: 'voice' }
  ];
}

export default function TabPage({ params }) {
  const tab = params?.tab || 'overview';
  return <MainLayout initialTab={tab} />;
}
