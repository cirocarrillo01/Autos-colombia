// backend/src/seeds/catalogoVehiculos.js
// Datos de apoyo del seed para la tabla `vehiculos`:
//   - modelo        -> anio de lanzamiento (VARCHAR(4))
//   - nombre_modelo -> nombre comercial (VARCHAR(50))
//   - color         -> color de la carroceria

export const MODELOS_POR_TIPO = {
  carro: [
    { nombre: "Toyota Hilux", anio: "2016" },
    { nombre: "Chevrolet Spark", anio: "2018" },
    { nombre: "Renault Duster", anio: "2017" },
    { nombre: "Kia Rio", anio: "2019" },
    { nombre: "Nissan Versa", anio: "2020" },
    { nombre: "Hyundai Tucson", anio: "2021" },
    { nombre: "Mazda CX-5", anio: "2022" },
    { nombre: "Volkswagen Gol", anio: "2023" },
  ],
  moto: [
    { nombre: "Yamaha MT-07", anio: "2017" },
    { nombre: "Honda CB 125F", anio: "2019" },
    { nombre: "Suzuki Ninja", anio: "2020" },
    { nombre: "Kawasaki Ninja 300", anio: "2021" },
    { nombre: "BMW F 900R", anio: "2022" },
  ],
};

export const COLORES = [
  "Blanco",
  "Negro",
  "Plata",
  "Gris",
  "Rojo",
  "Azul",
  "Verde",
];
