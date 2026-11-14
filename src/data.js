// Source: Wikipedia discography + Linktree / Spotify (scraped with Firecrawl)
// `hue` / `pattern` drive the procedurally designed sleeve art for catalog albums.
export const albums = [
  { year: 1989, name: 'Empezando a Vivir', label: 'CBS / Sony Discos', hits: ['De La Cabeza A Los Pies'], hue: 352, pattern: 'rings' },
  { year: 1990, name: 'Abriendo Puertas', label: 'Sony Discos', hits: ['Esa Niña', 'Dime', 'Nada Sin Ti', 'Como un Milagro'], hue: 38, pattern: 'sun' },
  { year: 1992, name: 'Cuenta Conmigo', label: 'Sony Discos · 3× Platino', hits: ['Amores Como El Nuestro', 'Casi un Hechizo', 'Cuenta Conmigo', 'Me Estoy Enamorando'], hue: 44, pattern: 'foil', star: true },
  { year: 1993, name: 'Cara de Niño', label: 'Sony Discos', hits: ['¿Qué Hay de Malo?', 'Cara de Niño', 'No Hieras Mi Vida'], hue: 8, pattern: 'stripes' },
  { year: 1994, name: 'Lo Nuevo y lo Mejor', label: 'Sony Discos', hits: ['Me Estoy Enloqueciendo Por Ti'], hue: 200, pattern: 'dots' },
  { year: 1995, name: 'Magia', label: 'Sony Discos', hits: ['Magia', 'Ahora Que Estoy Solo'], hue: 280, pattern: 'sun' },
  { year: 1996, name: 'Fresco', label: 'Sony Discos', hits: ['Suave', 'Loco de Amor', 'Una y Mil Veces', 'Lloraré'], hue: 168, pattern: 'rings' },
  { year: 1997, name: 'Ya No Soy el Niño Aquel', label: 'Sony Discos', hits: ['Ya No Soy el Niño Aquel', 'El Amor Nunca Pregunta'], hue: 20, pattern: 'stripes' },
  { year: 1999, name: 'De Otra Manera', label: 'Sony Discos', hits: ['Ese', 'De Qué Vale Ser un Rey', 'Si Tú Me Faltas'], hue: 340, pattern: 'foil' },
  { year: 2000, name: 'Para Siempre', label: 'Sony Discos', hits: ['Amor de Novela'], hue: 225, pattern: 'dots' },
  { year: 2001, name: 'Rivera', label: 'BMG', hits: ['Quiero', 'Muero'], hue: 0, pattern: 'foil', star: true },
  { year: 2002, name: 'Vuela Muy Alto', label: 'BMG', hits: ['Vuela Muy Alto', 'Herida Mortal'], hue: 205, pattern: 'sun' },
  { year: 2003, name: 'Canto a Mi Ídolo… Frankie Ruiz', label: 'Nominado al Latin Grammy', hits: ['Mi Libertad (ft. Voltio)'], hue: 30, pattern: 'rings', star: true },
  { year: 2005, name: 'Ay! Mi Vida', label: 'Sony BMG', hits: ['Ay Mi Vida', 'Ríos de Dolor'], hue: 330, pattern: 'stripes' },
  { year: 2007, name: 'Caribe Gardel', label: 'EMI Music', hits: ['Cuesta Abajo', 'Yira Yira'], hue: 50, pattern: 'dots' },
  { year: 2010, name: 'El Amor Existe', label: 'VeneMusic', hits: ['Solo Pienso En Ti', 'Solo Con Un Beso', 'El Amor Existe'], hue: 355, pattern: 'sun' },
  { year: 2012, name: 'Jerry Christmas', label: 'Universal Latino', hits: [], hue: 140, pattern: 'rings' },
  { year: 2014, name: 'Sólo para Mujeres', label: 'Sony U.S. Latin', hits: [], hue: 315, pattern: 'foil' },
  { year: 2026, name: 'Salsa Es Destino Y Rumbo', label: 'Single', hits: ['Salsa Es Destino Y Rumbo'], cover: '/img/salsa-destino.webp' },
  { year: 2026, name: 'Mi Isla del Encanto', label: 'El Nuevo Orden Musical', hits: ['Mi Isla del Encanto'], cover: '/img/mi-isla.webp', star: true },
];

// Recent Instagram posts (scraped 2026-11-14)
export const posts = [
  { url: 'https://instagram.com/p/DfsAr6CspJf', date: '2026-11-13', text: '¡México, ya falta poquito para llevarles todo el sabor boricua! 🇵🇷 Nos vemos este 17 de noviembre en el Auditorio Nacional.', likes: 2193, comments: 121, views: 19281, tag: 'Gira' },
  { url: 'https://instagram.com/p/DfpppOIpY8z', date: '2026-11-12', text: '#TBT Ya han pasado dos años desde el lanzamiento de “Te Buscaré”. ¿La escucharon? #LaVidaConJerry', likes: 3556, comments: 161, views: 34072, tag: 'TBT' },
  { url: 'https://instagram.com/p/DezXelTRezm', date: '2026-10-22', text: 'Regrabando los temas que marcaron una época y que siguen haciendo historia 🔥 @infanteisidro @andino.edgar #ElNuevoOrdenMusical', likes: 56576, comments: 2843, views: 527866, tag: 'Estudio' },
  { url: 'https://instagram.com/p/DeXLNqtvHyv', date: '2026-10-11', text: 'A todos los maestros que dejaron huella en mi camino… ¡que su legado viva por siempre! #elnuevoordenmusical', likes: 7601, comments: 139, views: 148980, tag: 'Legado' },
  { url: 'https://instagram.com/p/DeUd4aFJduR', date: '2026-10-10', text: '¡Que viva Puerto Rico y todas sus bellezas! 🇵🇷 🦜 ”Mi Isla del Encanto” disponible ya… #ElNuevoOrdenMusical', likes: 12826, comments: 467, views: 129052, tag: 'Lanzamiento' },
  { url: 'https://instagram.com/p/DeNRYOwps8C', date: '2026-10-07', text: 'Desde Puerto Rico hasta New York 🗽 la #salsa, es destino y rumbo.', likes: 2620, comments: 78, tag: 'Salsa' },
  { url: 'https://instagram.com/p/Ddy7tu2xFqG', date: '2026-09-27', text: '@milly_quezada Qué placer inmenso compartir con esta gran maestra e ícono del merengue, una verdadera pionera…', likes: 11682, comments: 276, tag: 'Leyendas' },
  { url: 'https://instagram.com/p/Dd2EyztJc45', date: '2026-09-28', text: 'Gracias, Punta Cana 🇩🇴 Siempre un placer cantar para ustedes. #ElNuevoOrdenMusical', likes: 1034, comments: 83, views: 29330, tag: 'En Vivo' },
];

export const SHOW_DATE = '2026-11-17T20:30:00-06:00'; // Auditorio Nacional, CDMX
