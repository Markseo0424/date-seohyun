import { deleteApplication, sendApiError } from "../_db.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "DELETE") {
      const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      const deleted = await deleteApplication(id);
      if (!deleted) return res.status(404).json({ error: "신청을 찾을 수 없습니다." });
      return res.status(204).end();
    }

    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "지원하지 않는 요청입니다." });
  } catch (error) {
    return sendApiError(res, error);
  }
}
