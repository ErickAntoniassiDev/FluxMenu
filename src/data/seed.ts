import { Product, RestaurantConfig } from '../types';

export const RESTAURANT_PROFILES: RestaurantConfig[] = [
  {
    restaurantId: 'rest_gusto',
    name: "Gusto & Charcoal",
  rating: "4.9",
  deliveryEstimate: "15-25 min",
  address: "Alameda Lorena, 1420 - Jardins, São Paulo - SP",
    instagram: "@gustocharcoal"
  },
  {
    restaurantId: 'rest_bistro',
    name: "Bistro Aurora",
    rating: "4.8",
    deliveryEstimate: "12-22 min",
    address: "Rua Harmonia, 890 - Vila Madalena, São Paulo - SP",
    instagram: "@bistroaurora",
    phone: "(11) 4002-2026"
  }
];

export const RESTAURANT_PROFILE: RestaurantConfig = RESTAURANT_PROFILES[0];

export const MENU_PRODUCTS: Product[] = [
  // ENTRADAS
  {
    id: "e1",
    restaurantId: 'rest_gusto',
    name: "Coxinhas de Costela Premium (4 unid.)",
    description: "Massa finíssima de batata baroa, recheada com costela premium desfiada e catupiry original. Acompanha geleia artesanal de pimenta defumada.",
    price: 36.00,
    category: "entradas",
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 10
  },
  {
    id: "e2",
    restaurantId: 'rest_gusto',
    name: "Fritas Rústicas com Grana Padano & Alecrim",
    description: "Batatas rústicas com corte artesanal, fritas na temperatura perfeita, polvilhadas com queijo Grana Padano italiano ralado na hora e alecrim fresco.",
    price: 29.00,
    category: "entradas",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 8
  },
  {
    id: "e3",
    restaurantId: 'rest_gusto',
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
    restaurantId: 'rest_gusto',
    name: "Alquimia Charcoal Burger",
    description: "Blend bovino Angus na brasa de 160g, fatias generosas de cheddar inglês derretido, bacon artesanal caramelizado, cebola roxa e maionese defumada no pão de brioche tostado.",
    price: 46.00,
    category: "hamburgueres",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 15
  },
  {
    id: "h2",
    restaurantId: 'rest_gusto',
    name: "Triple Smash Cheddar",
    description: "Três burgers ultra smash de 70g bem prensados com crostinha na chapa, queijo cheddar derretido entre cada camada, cebola picadinha, picles e molho secreto no pão brioche.",
    price: 49.00,
    category: "hamburgueres",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 12
  },
  {
    id: "h3",
    restaurantId: 'rest_gusto',
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
    restaurantId: 'rest_gusto',
    name: "Margherita Especialle Al Tartufo",
    description: "Massa napolitana de fermentação lenta (48h), molho de tomate San Marzano DOP, muçarela de búfala fresca, ramos de manjericão gigante e gotas de azeite trufado.",
    price: 68.00,
    category: "pizzas",
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 18
  },
  {
    id: "p2",
    restaurantId: 'rest_gusto',
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
    restaurantId: 'rest_gusto',
    name: "Soda Artesanal de Frutas Vermelhas & Limão Siciliano",
    description: "Feita com redução concentrada de mirtilo, amora e morango selvagem, água com gás purificada e rodelas frescas de limão siciliano orgânico.",
    price: 16.00,
    category: "bebidas",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 4
  },
  {
    id: "b2",
    restaurantId: 'rest_gusto',
    name: "Chopp Craft IPA Trincando (400ml)",
    description: "Dose generosa de chopp IPA artesanal local com notas cítricas proeminentes, frescor irresistível e espuma densa ideal. Servido em copo ultrcongelado.",
    price: 18.00,
    category: "bebidas",
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 3
  },
  {
    id: "b3",
    restaurantId: 'rest_gusto',
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
    restaurantId: 'rest_gusto',
    name: "Grand Gateau de Ninho com Morangos",
    description: "Gateau quente de ganache de chocolate belga, imerso em creme aveludado de leite Ninho original, picolé de baunilha empanado no chocolate e morangos frescos picados.",
    price: 34.00,
    category: "sobremesas",
    image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 10
  },
  {
    id: "s2",
    restaurantId: 'rest_gusto',
    name: "Pudim de Leite com Calda de Baunilha do Cerrado",
    description: "A textura sedosa definitiva: pudim de doce de leite super cremoso (sem furinhos), regado com uma calda espessa caramelizada infusionada com baunilha pura do Cerrado.",
    price: 24.00,
    category: "sobremesas",
    image: "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 5
  },
  {
    id: "ba_e1",
    restaurantId: 'rest_bistro',
    name: "Bruschetta Aurora de Tomates Assados",
    description: "Pão artesanal tostado com tomates confitados, manjericão fresco, azeite extravirgem e flor de sal.",
    price: 28.00,
    category: "entradas",
    image: "https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 8,
    available: true
  },
  {
    id: "ba_p1",
    restaurantId: 'rest_bistro',
    name: "Pizza Aurora de Burrata e Parma",
    description: "Massa fina de fermentação natural com burrata cremosa, presunto parma, rúcula e redução balsâmica.",
    price: 72.00,
    category: "pizzas",
    image: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 17,
    available: true
  },
  {
    id: "ba_b1",
    restaurantId: 'rest_bistro',
    name: "Limonada Siciliana com Hortelã",
    description: "Limão siciliano, folhas frescas de hortelã, água com gás e xarope artesanal leve.",
    price: 15.00,
    category: "bebidas",
    image: "https://images.unsplash.com/photo-1523371054106-bbf80586c38c?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 4,
    available: true
  },
  {
    id: "ba_s1",
    restaurantId: 'rest_bistro',
    name: "Tiramisù Clássico da Casa",
    description: "Camadas de mascarpone, café espresso, cacau belga e biscoito champagne embebido na medida certa.",
    price: 31.00,
    category: "sobremesas",
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80",
    prepTimeMinutes: 6,
    available: true
  }
];

export const INITIAL_ORDERS = [
  {
    id: "#1024",
    restaurantId: 'rest_gusto',
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
    restaurantId: 'rest_gusto',
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
    restaurantId: 'rest_gusto',
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
    restaurantId: 'rest_gusto',
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
  },
  {
    id: "#2024",
    restaurantId: 'rest_bistro',
    table: "Mesa 02",
    items: [
      { productId: "ba_p1", name: "Pizza Aurora de Burrata e Parma", quantity: 1, observation: "Rúcula à parte.", price: 72.00 },
      { productId: "ba_b1", name: "Limonada Siciliana com Hortelã", quantity: 2, observation: "Pouco gelo.", price: 15.00 }
    ],
    status: "novo" as const,
    createdAt: new Date(Date.now() - 7 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 60000).toISOString(),
    total: 102.00,
    priority: "media" as const,
    notes: "",
    paymentStatus: 'pendente' as const
  },
  {
    id: "#2025",
    restaurantId: 'rest_bistro',
    table: "Mesa Varanda",
    items: [
      { productId: "ba_e1", name: "Bruschetta Aurora de Tomates Assados", quantity: 2, observation: "Sem alho em uma unidade.", price: 28.00 },
      { productId: "ba_s1", name: "Tiramisù Clássico da Casa", quantity: 1, observation: "Servir depois dos pratos.", price: 31.00 }
    ],
    status: "preparo" as const,
    createdAt: new Date(Date.now() - 16 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    total: 87.00,
    priority: "alta" as const,
    notes: "",
    paymentStatus: 'pendente' as const
  }
];
