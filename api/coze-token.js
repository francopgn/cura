export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.status(200).json({
    token: process.env.COZE_TOKEN
  });
}
