import { Blocks, Sailboat, Truck } from 'lucide-react';

// Stable editorial fixtures keep SSR and hydration consistent; these are not world-state data.
const economyShowcase = {
  companies: [
    {
      id: 'basalt',
      name: 'home.economy.basalt.name',
      sector: 'home.economy.basalt.sector',
      description: 'home.economy.basalt.description',
      state: 'home.economy.riverUnion',
      team: 'home.economy.basalt.team',
      image: '/world/castle-small.webp',
      icon: Blocks,
    },
    {
      id: 'shipyard',
      name: 'home.economy.shipyard.name',
      sector: 'home.economy.shipyard.sector',
      description: 'home.economy.shipyard.description',
      state: 'home.economy.aurora',
      team: 'home.economy.shipyard.team',
      image: '/world/town-small.webp',
      icon: Sailboat,
    },
    {
      id: 'northway',
      name: 'home.economy.northway.name',
      sector: 'home.economy.northway.sector',
      description: 'home.economy.northway.description',
      state: 'home.economy.veloria',
      team: 'home.economy.northway.team',
      image: '/world/skyline-small.webp',
      icon: Truck,
    },
  ],
  currencies: [
    { code: 'CRN', name: 'home.economy.crown', issuer: 'home.economy.riverUnion', rate: '1.00' },
    { code: 'AUR', name: 'home.economy.mark', issuer: 'home.economy.aurora', rate: '1.25' },
    { code: 'VLR', name: 'home.economy.thaler', issuer: 'home.economy.veloria', rate: '0.80' },
  ],
} as const;
export { economyShowcase };
