import { accountDetail, settleAccount } from '@/lib/accounts';
import {
  requireAdmin,
  sameOrigin,
  jsonBody,
  failure,
  HttpError,
  privateJson,
} from '@/lib/security';
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const id = new URL(req.url).searchParams.get('fitter_id');
    if (!id || id.length > 128) throw new HttpError(400, 'Invalid fitter');
    return privateJson(await accountDetail(id));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const { fitter_id, receipt_id, note, expected_amount, expected_count } =
      await jsonBody(req);
    if (
      typeof fitter_id !== 'string' ||
      !fitter_id ||
      fitter_id.length > 128 ||
      typeof receipt_id !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(receipt_id) ||
      typeof note !== 'string' ||
      note.length > 500 ||
      typeof expected_amount !== 'number' ||
      !Number.isSafeInteger(expected_amount) ||
      expected_amount < 0 ||
      typeof expected_count !== 'number' ||
      !Number.isSafeInteger(expected_count) ||
      expected_count < 1
    )
      throw new HttpError(400, 'Invalid settlement');
    return privateJson(
      await settleAccount(
        fitter_id,
        receipt_id,
        note.trim(),
        expected_amount,
        expected_count,
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
