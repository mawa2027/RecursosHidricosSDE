export const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rules.label || field} es requerido`);
        continue;
      }

      if (value === undefined || value === null || value === '') continue;

      if (rules.minLength && String(value).length < rules.minLength) {
        errors.push(`${rules.label || field} debe tener al menos ${rules.minLength} caracteres`);
      }

      if (rules.maxLength && String(value).length > rules.maxLength) {
        errors.push(`${rules.label || field} no puede tener más de ${rules.maxLength} caracteres`);
      }

      if (rules.email && !/\S+@\S+\.\S+/.test(value)) {
        errors.push(`${rules.label || field} no es un email válido`);
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${rules.label || field} debe ser uno de: ${rules.enum.join(', ')}`);
      }

      if (rules.number && isNaN(Number(value))) {
        errors.push(`${rules.label || field} debe ser un número`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Errores de validación', details: errors });
    }

    next();
  };
};
