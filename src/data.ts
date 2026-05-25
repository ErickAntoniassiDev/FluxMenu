import { Product, RestaurantConfig } from './types';

export const RESTAURANT_PROFILE: RestaurantConfig = {
  name: "Gusto & Charcoal",
  rating: "4.9",
  deliveryEstimate: "15-25 min",
  address: "Alameda Lorena, 1420 - Jardins, São Paulo - SP",
  instagram: "@gustocharcoal"
};

export const MENU_PRODUCTS: Product[] = [
  // ENTRADAS
  {
    id: "e1",
    name: "Coxinhas de Costela Premium (4 unid.)",
    description: "Massa finíssima de batata baroa, recheada com costela premium desfiada e catupiry original. Acompanha geleia artesanal de pimenta defumada.",
    price: 36.00,
    category: "entradas",
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 10
  },
  {
    id: "e2",
    name: "Fritas Rústicas com Grana Padano & Alecrim",
    description: "Batatas rústicas com corte artesanal, fritas na temperatura perfeita, polvilhadas com queijo Grana Padano italiano ralado na hora e alecrim fresco.",
    price: 29.00,
    category: "entradas",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 8
  },
  {
    id: "e3",
    name: "Bolinhos de Mandioca com Queijo Coalho (6 unid.)",
    description: "Bolinhos crocantes feitos com mandioca selecionada e recheio de queijo coalho cremoso. Servidos com melaço de cana de Minas Gerais.",
    price: 32.00,
    category: "entradas",
    image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 12
  },

  // HAMBÚRGUERES
  {
    id: "h1",
    name: "Alquimia Charcoal Burger",
    description: "Blend bovino Angus na brasa de 160g, fatias generosas de cheddar inglês derretido, bacon artesanal caramelizado, cebola roxa e maionese defumada no pão de brioche tostado.",
    price: 46.00,
    category: "hamburgueres",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 15
  },
  {
    id: "h2",
    name: "Triple Smash Cheddar",
    description: "Três burgers ultra smash de 70g bem prensados com crostinha na chapa, queijo cheddar derretido entre cada camada, cebola picadinha, picles e molho secreto no pão brioche.",
    price: 49.00,
    category: "hamburgueres",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 12
  },
  {
    id: "h3",
    name: "Jardins Plant Burger",
    description: "Blend 100% vegetal feito na brasa, rúcula hidropônica fresca, tomate caipira grelhado, queijo coalho chapeado e maionese verde de ervas finas no pão australiano.",
    price: 42.00,
    category: "hamburgueres",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 14
  },

  // PIZZAS
  {
    id: "p1",
    name: "Margherita Especialle Al Tartufo",
    description: "Massa napolitana de fermentação lenta (48h), molho de tomate San Marzano DOP, muçarela de búfala fresca, ramos de manjericão gigante e gotas de azeite trufado.",
    price: 68.00,
    category: "pizzas",
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 18
  },
  {
    id: "p2",
    name: "Calabresa Defumada com Cream Cheese",
    description: "Incrível combinação de calabresa artesanal defumada e cortada fininha, cebolas roxas adocicadas, queijo muçarela premium, cream cheese Philadelphia e orégano fresco.",
    price: 64.00,
    category: "pizzas",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 18
  },

  // BEBIDAS
  {
    id: "b1",
    name: "Soda Artesanal de Frutas Vermelhas & Limão Siciliano",
    description: "Feita com redução concentrada de mirtilo, amora e morango selvagem, água com gás purificada e rodelas frescas de limão siciliano orgânico.",
    price: 16.00,
    category: "bebidas",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 4
  },
  {
    id: "b2",
    name: "Chopp Craft IPA Trincando (400ml)",
    description: "Dose generosa de chopp IPA artesanal local com notas cítricas proeminentes, frescor irresistível e espuma densa ideal. Servido em copo ultrcongelado.",
    price: 18.00,
    category: "bebidas",
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 3
  },
  {
    id: "b3",
    name: "Suco Natural de Amora Express",
    description: "Prensado a frio com amoras selecionadas colhidas de cooperativas agrícolas orgânicas brasileiras. 100% puro, sem açúcar ou conservantes.",
    price: 14.00,
    category: "bebidas",
    image: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 4
  },

  // SOBREMESAS
  {
    id: "s1",
    name: "Grand Gateau de Ninho com Morangos",
    description: "Gateau quente de ganache de chocolate belga, imerso em creme aveludado de leite Ninho original, picolé de baunilha empanado no chocolate e morangos frescos picados.",
    price: 34.00,
    category: "sobremesas",
    image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 10
  },
  {
    id: "s2",
    name: "Pudim de Leite com Calda de Baunilha do Cerrado",
    description: "A textura sedosa definitiva: pudim de doce de leite super cremoso (sem furinhos), regado com uma calda espessa caramelizada infusionada com baunilha pura do Cerrado.",
    price: 24.00,
    category: "sobremesas",
    image: "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 5
  }
];

export const INITIAL_ORDERS = [
  {
    id: "#1024",
    table: "Mesa 08",
    items: [
      { productId: "h1", name: "Alquimia Charcoal Burger", quantity: 2, observation: "Ponto médio para bem passado, sem cebola.", price: 46.00 },
      { productId: "e2", name: "Fritas Rústicas com Grana Padano & Alecrim", quantity: 1, observation: "Crocantes por favor.", price: 29.00 },
      { productId: "b2", name: "Chopp Craft IPA Trincando (400ml)", quantity: 2, observation: "Trazer antes da comida.", price: 18.00 }
    ],
    status: "preparo" as const,
    createdAt: new Date(Date.now() - 14 * 60000).toISOString(), // 14 mins ago
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    total: 157.00,
    priority: "alta" as const,
    notes: ""
  },
  {
    id: "#1025",
    table: "Mesa 03",
    items: [
      { productId: "p1", name: "Margherita Especialle Al Tartufo", quantity: 1, observation: "Azeite trufado caprichado.", price: 68.00 },
      { productId: "b1", name: "Soda Artesanal de Frutas Vermelhas & Limão Siciliano", quantity: 1, observation: "Sem gelo.", price: 16.00 }
    ],
    status: "novo" as const,
    createdAt: new Date(Date.now() - 4 * 60000).toISOString(), // 4 mins ago
    updatedAt: new Date(Date.now() - 4 * 60000).toISOString(),
    total: 84.00,
    priority: "media" as const,
    notes: ""
  },
  {
    id: "#1026",
    table: "Mesa 12",
    items: [
      { productId: "h2", name: "Triple Smash Cheddar", quantity: 1, observation: "Pão de brioche bem selado na manteiga", price: 49.00 },
      { productId: "s2", name: "Pudim de Leite com Calda de Baunilha do Cerrado", quantity: 1, observation: "Servir junto com a conta", price: 24.00 }
    ],
    status: "pronto" as const,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(), // 25 mins ago
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    total: 73.00,
    priority: "baixa" as const,
    notes: ""
  },
  {
    id: "#1023",
    table: "Mesa 05",
    items: [
      { productId: "e1", name: "Coxinhas de Costela Premium (4 unid.)", quantity: 1, observation: "Sem cebolinha por cima por alergia severa.", price: 36.00 },
      { productId: "b3", name: "Suco Natural de Amora Express", quantity: 1, observation: "Com adoçante e muito gelo.", price: 14.00 }
    ],
    status: "entregue" as const,
    createdAt: new Date(Date.now() - 42 * 60000).toISOString(), // 42 mins ago
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    total: 50.00,
    priority: "urgente" as const,
    notes: "Alergia alimentar séria!"
  }
];
