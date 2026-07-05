import {
  createApplication,
  listApplications,
  readJsonBody,
  sendApiError,
} from "./_db.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      const applications = await listApplications();
      return res.status(200).json(applications);
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const application = await createApplication(body);
      return res.status(201).json(application);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "지원하지 않는 요청입니다." });
  } catch (error) {
    return sendApiError(res, error);
  }
}
