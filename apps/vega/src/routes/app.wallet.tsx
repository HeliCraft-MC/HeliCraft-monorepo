import { createFileRoute } from '@tanstack/react-router';
import { WalletPage } from '../monetary/wallet';

const Route = createFileRoute('/app/wallet')({ component: WalletPage });
export { Route };
