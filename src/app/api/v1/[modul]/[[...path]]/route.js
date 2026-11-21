import { tanganiRequest } from '@/middlewares/routeHandler';

export const dynamic = 'force-dynamic';

/** Menyalurkan request ke daftar route modul (tanpa logika di sini). */
async function salurkan(request, metode, { params }) {
  const { modul, path } = await params;
  return tanganiRequest(request, metode, [modul, ...(path ?? [])]);
}

export const GET = (request, ctx) => salurkan(request, 'GET', ctx);
export const POST = (request, ctx) => salurkan(request, 'POST', ctx);
export const PUT = (request, ctx) => salurkan(request, 'PUT', ctx);
export const DELETE = (request, ctx) => salurkan(request, 'DELETE', ctx);
