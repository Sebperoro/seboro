export type Book = {
  slug: string;
  title: string;
  author: string;
  genre: string;
  rating: number;
  status: "Terminada" | "En proceso";
  price: number;
  synopsis: string;
  cover: string;
  chapters: { title: string; content: string[] }[];
};

export const books: Book[] = [
  {
    slug: "el-reino-de-ceniza",
    title: "El Reino de Ceniza",
    author: "Marina Torres",
    genre: "Fantasía",
    rating: 4.8,
    status: "Terminada",
    price: 79,
    synopsis:
      "Una ciudad construida sobre las ruinas de un reino antiguo empieza a recordar aquello que sus habitantes juraron olvidar. Mara encuentra una carta imposible y deberá decidir si revelar la verdad o proteger la historia que mantiene unido a su pueblo.",
    cover:
      "linear-gradient(160deg, #7c2d12 0%, #27272a 45%, #09090b 100%)",
    chapters: [
      {
        title: "Capítulo 1 — La carta",
        content: [
          "La carta llegó sin sello, sin remitente y sin una sola marca de polvo.",
          "Mara la encontró apoyada contra la puerta de su habitación antes del amanecer. Nadie en la casa había oído pasos durante la noche.",
          "En el centro del sobre, escrito con una tinta gris que parecía ceniza, estaba su nombre.",
          "No debía abrirla. Lo supo antes de tocarla. Aun así, rompió el borde con el pulgar.",
        ],
      },
      {
        title: "Capítulo 2 — Bajo la ciudad",
        content: [
          "Las escaleras del archivo descendían mucho más de lo que Mara recordaba.",
          "Cada piso parecía arrancarle un poco de luz al anterior, hasta que solo quedó el resplandor azul de las lámparas de emergencia.",
          "Al final del corredor encontró una puerta que no figuraba en ningún plano.",
          "Y en esa puerta estaba grabado el mismo símbolo que había visto dentro de la carta.",
        ],
      },
      {
        title: "Capítulo 3 — Lo que quedó del reino",
        content: [
          "La sala estaba llena de nombres borrados.",
          "Cientos de placas de piedra cubrían las paredes, todas raspadas con una violencia meticulosa.",
          "Mara entendió entonces que la ciudad no había olvidado su pasado por accidente.",
          "Alguien se había asegurado de que nadie pudiera recordarlo.",
        ],
      },
    ],
  },
  {
    slug: "la-casa-del-umbral",
    title: "La Casa del Umbral",
    author: "Diego Neri",
    genre: "Misterio",
    rating: 4.6,
    status: "En proceso",
    price: 49,
    synopsis:
      "Cinco habitaciones, una casa que aparece solo durante la lluvia y un huésped que insiste en que todos ya estuvieron allí antes.",
    cover:
      "linear-gradient(160deg, #164e63 0%, #18181b 50%, #09090b 100%)",
    chapters: [
      {
        title: "Capítulo 1 — La lluvia",
        content: [
          "La casa apareció donde el lunes no había nada.",
          "Daniel pensó que era una broma hasta que vio luz detrás de la ventana del segundo piso.",
          "La lluvia caía con tanta fuerza que la calle parecía desaparecer bajo sus zapatos.",
        ],
      },
      {
        title: "Capítulo 2 — Cinco puertas",
        content: [
          "Dentro no había muebles, solo cinco puertas.",
          "Cada una tenía un número y una manija distinta.",
          "La quinta estaba abierta.",
        ],
      },
    ],
  },
  {
    slug: "nunca-mires-atras",
    title: "Nunca Mires Atrás",
    author: "Lucía Salas",
    genre: "Terror",
    rating: 4.7,
    status: "Terminada",
    price: 69,
    synopsis:
      "Una carretera sin señal, una voz en la radio y una única regla: no mires por el espejo retrovisor.",
    cover:
      "linear-gradient(160deg, #3f3f46 0%, #111827 45%, #020617 100%)",
    chapters: [
      {
        title: "Capítulo 1 — Kilómetro 41",
        content: [
          "La señal desapareció exactamente en el kilómetro cuarenta y uno.",
          "Sara golpeó el tablero dos veces y la radio respondió con un susurro.",
          "No era música.",
        ],
      },
      {
        title: "Capítulo 2 — El espejo",
        content: [
          "La voz repitió la instrucción tres veces.",
          "No mires atrás.",
          "Sara apretó las manos contra el volante y siguió conduciendo.",
        ],
      },
    ],
  },
  {
    slug: "despues-del-invierno",
    title: "Después del Invierno",
    author: "Nora Castillo",
    genre: "Drama",
    rating: 4.5,
    status: "Terminada",
    price: 59,
    synopsis:
      "Dos hermanos regresan al pueblo que abandonaron de niños y encuentran una promesa que ninguno recuerda haber hecho.",
    cover:
      "linear-gradient(160deg, #475569 0%, #334155 45%, #0f172a 100%)",
    chapters: [
      {
        title: "Capítulo 1 — Regreso",
        content: [
          "El pueblo parecía más pequeño desde la carretera.",
          "Quizá siempre lo había sido.",
          "Irene no habló hasta que la vieja estación apareció detrás de los árboles.",
        ],
      },
      {
        title: "Capítulo 2 — La promesa",
        content: [
          "Encontraron la caja debajo del piso del dormitorio.",
          "Dentro había dos fotografías y una nota escrita por ellos mismos.",
          "Ninguno reconoció la letra.",
        ],
      },
    ],
  },
  {
    slug: "ciudad-de-cristal",
    title: "Ciudad de Cristal",
    author: "Álvaro Méndez",
    genre: "Ciencia ficción",
    rating: 4.4,
    status: "En proceso",
    price: 55,
    synopsis:
      "En una ciudad donde todos los recuerdos se almacenan, una técnica descubre que algunos están siendo reemplazados.",
    cover:
      "linear-gradient(160deg, #1d4ed8 0%, #172554 45%, #020617 100%)",
    chapters: [
      {
        title: "Capítulo 1 — Copia de seguridad",
        content: [
          "A las tres de la mañana, los recuerdos de doce mil personas dejaron de coincidir.",
          "Eva fue la primera en notarlo.",
          "El sistema insistía en que no había ningún error.",
        ],
      },
      {
        title: "Capítulo 2 — Memoria ajena",
        content: [
          "La grabación mostraba una infancia que Eva nunca había vivido.",
          "Sin embargo, podía recordar el olor de aquella cocina.",
          "Eso era lo imposible.",
        ],
      },
    ],
  },
];

export function getBook(slug: string) {
  return books.find((book) => book.slug === slug);
}
