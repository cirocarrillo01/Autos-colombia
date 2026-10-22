// backend/src/config/catalogoVehiculos.js
// ============================================================================
// CATÁLOGO DE VEHÍCULOS - AUTO COLOMBIA
// ============================================================================
// Fuente única de verdad para los datos de modelo, año y color que se siembran
// en la tabla `vehiculos`.
//
// En `vehiculos`:
//   - `modelo`        -> AÑO en que salió el modelo del vehículo (VARCHAR(4)).
//   - `nombre_modelo` -> nombre comercial del modelo (VARCHAR(50)).
//   - `color`         -> color de la carrocería.
//
// El seed y la migración de datos usan este mismo catálogo para que una base
// recién sembrada y una base ya sincronizada queden idénticas.
// ============================================================================

// Modelos por tipo de vehículo (el índice del tipo decide el color y el año).
export const MODELOS_POR_TIPO = {
  carro: [
    "Toyota Hilux",
    "Chevrolet Spark",
    "Renault Duster",
    "Kia Rio",
    "Nissan Versa",
    "Hyundai Tucson",
    "Mazda CX-5",
    "Volkswagen Gol",
  ],
  moto: [
    "Yamaha MT-07",
    "Honda CB 125F",
    "Suzuki Ninja",
    "Kawasaki Ninja 300",
    "BMW F 900R",
  ],
};

// Años de salida de los modelos (4 dígitos) por nombre comercial.
// Es la fuente de verdad del año: el seed y la migración de datos usan este
// mismo mapa, así que una base recién sembrada y una base ya sincronizada
// quedan idénticas.
export const ANIO_POR_MODELO = {
  // Carros
  "Toyota Hilux": "2016",
  "Chevrolet Spark": "2018",
  "Renault Duster": "2017",
  "Kia Rio": "2019",
  "Nissan Versa": "2020",
  "Hyundai Tucson": "2021",
  "Mazda CX-5": "2022",
  "Volkswagen Gol": "2023",
  // Motos
  "Yamaha MT-07": "2017",
  "Honda CB 125F": "2019",
  "Suzuki Ninja": "2020",
  "Kawasaki Ninja 300": "2021",
  "BMW F 900R": "2022",
};

// Año por defecto cuando el nombre comercial no está en el catálogo
// (vehículos registrados a mano con un modelo desconocido).
export const ANIO_POR_DEFECTO = "2020";

export const COLORES = [
  "Blanco",
  "Negro",
  "Plata",
  "Gris",
  "Rojo",
  "Azul",
  "Verde",
];

// Número de la placa (CAR007 -> 7). Se usa como índice del catálogo para que
// la asignación sea determinista y repetible entre ejecuciones.
export const numeroDePlaca = (placa) => {
  const m = placa.match(/(\d+)/);
  return m ? Number(m[1]) : 1;
};

// Año de lanzamiento de un nombre comercial de modelo.
export const anioDeModelo = (nombreModelo) =>
  ANIO_POR_MODELO[nombreModelo] ?? ANIO_POR_DEFECTO;

// Modelo (nombre), año y color que le corresponden a una placa según su tipo.
//   - `modelo` -> nombre comercial del modelo (ej. "Toyota Hilux")
//   - `anio`   -> año de lanzamiento del modelo (ej. "2016")
//   - `color`  -> color de la carrocería (ej. "Blanco")
export const modeloAnioColorDe = (codigoTipo, placa) => {
  const modelos = MODELOS_POR_TIPO[codigoTipo] ?? MODELOS_POR_TIPO.carro;
  const n = numeroDePlaca(placa);
  const modelo = modelos[(n - 1) % modelos.length];
  return {
    modelo,
    anio: anioDeModelo(modelo),
    color: COLORES[(n - 1) % COLORES.length],
  };
};