console.log("API KEY:", process.env.BREVO_API_KEY);
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // ✅ Parseo seguro
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    const nombre = (body.nombre || "").trim();
    const email = (body.email || "").trim();
    const mensaje = (body.mensaje || "").trim();
    const token = body["cf-turnstile-response"];
    const honeypot = body.website;

    const apiKey = process.env.BREVO_API_KEY;
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

    // 🔴 Validaciones básicas
    if (!apiKey) {
      return res.status(500).json({ error: "Falta BREVO_API_KEY" });
    }

    if (!turnstileSecret) {
      return res.status(500).json({ error: "Falta TURNSTILE_SECRET_KEY" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email inválido" });
    }

    // 🛑 Honeypot
    if (honeypot) {
      return res.status(400).end();
    }

    // 🛑 Token captcha
    if (!token) {
      return res.status(400).json({ error: "Falta verificación" });
    }

    // ✅ TURNSTILE (blindado)
    let captchaData = { success: false };

    try {
      const params = new URLSearchParams();
      params.append("secret", turnstileSecret);
      params.append("response", token);

      const verifyRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: params,
        }
      );

      captchaData = await verifyRes.json();
    } catch (err) {
      console.error("ERROR TURNSTILE:", err);
      return res.status(500).json({ error: "Error verificando captcha" });
    }

    if (!captchaData.success) {
      console.error("Turnstile fail:", captchaData);
      return res.status(403).json({ error: "Captcha inválido" });
    }

    // 🛑 Filtro anti spam simple
    const texto = (mensaje + email).toLowerCase();

    if (
      texto.includes("http") ||
      texto.includes("www") ||
      texto.includes("buy") ||
      texto.includes("free")
    ) {
      return res.status(400).json({ error: "Spam detectado" });
    }

    // 📧 Email HTML
    const htmlContent = `
      <h2>Nuevo mensaje desde la web - Ley C.U.R.A.</h2>
      <p><strong>Nombre:</strong> ${nombre || "(no informado)"}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${mensaje.replace(/\n/g, "<br>")}</p>
    `;

    // 📧 ENVÍO BREVO
    let brevoRes;
    let brevoText = "";

    try {
      brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            // ⚠️ IMPORTANTE: este mail debe estar verificado en Brevo
            email: "contacto@leycura.org",
            name: "Ley C.U.R.A.",
          },
          to: [
            {
              email: "contacto@leycura.org",
              name: "Ley C.U.R.A.",
            },
          ],
          replyTo: {
            email,
            name: nombre || email,
          },
          subject: "Nuevo mensaje desde la web",
          htmlContent,
        }),
      });

      brevoText = await brevoRes.text();

    } catch (err) {
      console.error("ERROR BREVO FETCH:", err);
      return res.status(500).json({ error: "Error conectando con Brevo" });
    }

if (!brevoRes.ok) {
  console.error("BREVO STATUS:", brevoRes.status);

  const text = await brevoRes.text();
  console.error("BREVO RESPONSE:", text);

  return res.status(502).json({ error: "Error al enviar correo" });
}

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("ERROR API CONTACT:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
