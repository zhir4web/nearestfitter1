import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { supabase } from './repository';
import { HttpError } from './security';
const dir = () =>
  path.resolve(
    /* turbopackIgnore: true */ process.env.UPLOAD_DIR || 'data/uploads',
  );
export async function savePhoto(file: File) {
  if (
    file.size > 4 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  )
    throw new HttpError(400, 'Photo must be JPEG, PNG or WebP under 4 MB');
  let data: Buffer;
  try {
    data = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 25000000,
    })
      .rotate()
      .resize(1400, 1000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new HttpError(400, 'Invalid image');
  }
  const key = randomUUID() + '.webp',
    s = supabase();
  if (s) {
    const { error } = await s.storage
      .from('fitter-photos')
      .upload(key, data, { contentType: 'image/webp' });
    if (error) throw error;
  } else {
    await mkdir(dir(), { recursive: true });
    await writeFile(path.join(/* turbopackIgnore: true */ dir(), key), data);
  }
  return '/api/photos/' + key;
}
export async function readPhoto(key: string) {
  if (!/^[a-f0-9-]{36}\.webp$/.test(key)) throw new HttpError(404, 'Not found');
  const s = supabase();
  if (s) {
    const { data, error } = await s.storage.from('fitter-photos').download(key);
    if (error) throw new HttpError(404, 'Not found');
    return Buffer.from(await data.arrayBuffer());
  }
  try {
    return await readFile(
      /* turbopackIgnore: true */ path.join(
        /* turbopackIgnore: true */ dir(),
        key,
      ),
    );
  } catch {
    throw new HttpError(404, 'Not found');
  }
}
export async function removePhoto(url: string) {
  const key = url.split('/').pop() || '';
  if (!/^[a-f0-9-]{36}\.webp$/.test(key)) return;
  const s = supabase();
  if (s) {
    await s.storage.from('fitter-photos').remove([key]);
  } else {
    await unlink(path.join(/* turbopackIgnore: true */ dir(), key)).catch(
      () => {},
    );
  }
}
