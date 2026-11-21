import Link from 'next/link';

/** Header halaman: breadcrumb, judul, keterangan kecil, dan area aksi. */
export default function HeaderHalaman({ breadcrumb = [], judul, sub = null, badge = null, aksi = null }) {
  return (
    <header className="mb-5 space-y-2">
      {breadcrumb.length > 0 && (
        <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted">
          {breadcrumb.map((b, i) => (
            <span key={b.href} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <Link href={b.href} className="hover:text-accent hover:underline">
                {b.nama}
              </Link>
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{judul}</h1>
            {badge}
          </div>
          {sub}
        </div>
        {aksi && <div className="flex flex-wrap items-center gap-2">{aksi}</div>}
      </div>
    </header>
  );
}
