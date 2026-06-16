import { redirect } from 'next/navigation';

// Links were merged into the unified Sources page. Keep this route as a redirect
// so old bookmarks/links still land in the right place.
export default function LinksRedirect() {
    redirect('/sources');
}
