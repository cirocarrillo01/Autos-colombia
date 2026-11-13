export const responder = (res, status, texto, extra = null) => {
  const esExito = status >= 200 && status < 300;
  const payload = esExito 
    ? { mensaje: texto, ...extra } 
    : { error: texto };
    
  return res.status(status).json(payload);
};
