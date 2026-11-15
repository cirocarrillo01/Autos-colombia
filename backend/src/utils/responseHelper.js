export const responder = (res, status, texto, extra = null) => {
  const esExito = status >= 200 && status < 300;
  let payload;
  if (!esExito) {
    payload = { error: texto };
  } else {
    payload = { mensaje: texto };
    if (Array.isArray(extra)) {
      payload.data = extra;
    } else if (extra) {
      Object.assign(payload, extra);
    }
  }
  return res.status(status).json(payload);
};
