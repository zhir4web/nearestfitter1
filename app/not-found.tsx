import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="content-page empty">
      <h1>٤٠٤ — ئەم پەڕەیە نەدۆزرایەوە</h1>
      <Link className="button primary" href="/">
        گەڕانەوە بۆ نەخشە / Back to map
      </Link>
    </main>
  );
}
