export const debugTokenLogger = (req, res, next) => {
  const start = Date.now();

  const authHeader = req.headers.authorization;
  const userAgent = req.headers["user-agent"] || "";
  const url = req.originalUrl;
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  const RED = "\x1b[31m";
  const GREEN = "\x1b[32m";
  const YELLOW = "\x1b[33m";
  const CYAN = "\x1b[36m";
  const RESET = "\x1b[0m";
  const BOLD = "\x1b[1m";

  const suspiciousKeywords = [
    "nmap",
    "gobuster",
    "sqlmap",
    "dirbuster",
    "nikto",
    "python-requests",
    "curl",
    "wget"
  ];

  const isScanned = suspiciousKeywords.some(keyword =>
    userAgent.toLowerCase().includes(keyword) ||
    url.toLowerCase().includes(keyword)
  );

  console.log(`${CYAN}${BOLD}━━━━━━━━━━ REQUEST ━━━━━━━━━━${RESET}`);
  console.log(`${GREEN}${req.method}${RESET} ${url}`);
  console.log(`IP        : ${ip}`);
  console.log(`UserAgent : ${userAgent}`);

  if (isScanned) {
    console.log(`${RED}${BOLD}⚠ POTENTIAL SCANNER DETECTED${RESET}`);
  }

  // tampilkan query (kalau ada)
  if (Object.keys(req.query || {}).length > 0) {
    console.log(`Query     :`, req.query);
  }

  // Jangan log body/token detail agar tidak bocor data sensitif.
  if (!authHeader) {
    console.log(`${YELLOW}Auth      : No Authorization header${RESET}`);
  } else {
    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log(`${YELLOW}Auth      : Bearer tanpa token${RESET}`);
    } else {
      console.log(`${GREEN}Auth      : Bearer token present${RESET}`);
    }
  }

  // intercept response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;

    console.log(`${CYAN}━━━━━━━━━━ RESPONSE ━━━━━━━━━${RESET}`);
    console.log(`Status    : ${res.statusCode}`);
    console.log(`Time      : ${duration} ms`);

    if (res.statusCode >= 400) {
      console.log(`${RED}❌ ERROR RESPONSE${RESET}`);
      console.log(`Response  :`, typeof body === "string"
        ? body.substring(0, 300)
        : body);
    } else {
      console.log(`${GREEN}✔ Success${RESET}`);
    }

    console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

    return originalSend.call(this, body);
  };

  next();
};
