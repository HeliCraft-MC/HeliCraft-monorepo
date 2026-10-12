import { createFileRoute } from '@tanstack/react-router';
import { GalleryUpload } from '../gallery-upload';

const Route = createFileRoute('/app/gallery/new')({ component: GalleryUpload });
export { Route };
