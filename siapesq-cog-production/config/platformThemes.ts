export type PlatformState = "RS" | "ES" | "MG";

export const platformThemes = {
  RS: {
    state: "RS",
    logo: "/logo_rs.svg",
    map: "/images/Floating State Map RS (Visual decoration).png",
    heroImage: "/images/hero-rs.png",

    texts: {
      title: "Sobre a Plataforma SIAPESQ-RS",
      subtitle:
        "Ciência e tecnologia a serviço da biodiversidade do Rio Grande do Sul.",
      description:
        "O SIAPESQ-RS monitora continuamente a fauna e flora gaúcha, acompanhando espécies marinhas comerciais, controlando invasoras exóticas e preservando mamíferos, aves e répteis nativos característicos do Pampa e da Mata Atlântica.",
      mission:
        "Produzir dados científicos precisos e ferramentas de monitoramento para apoiar políticas públicas, proteção ambiental e o uso sustentável da biodiversidade do Rio Grande do Sul.",
      vision:
        "Ser a principal referência estadual em inteligência de dados aplicada à conservação da biodiversidade, integrando ciência participativa, tecnologia e inovação para um futuro sustentável no RS.",
    },

    colors: {
      primary: {
        100: "#DDF5FE",
        200: "#B3D5E6",
        300: "#7FB4CC",
        400: "#5CB5F6",
        500: "#004A80",
        600: "#003B66",
        700: "#002C4D",
        800: "#14273D",
        900: "#002045",
      },

      secondary: {
        100: "#D6EAD8",
        200: "#ADD5B1",
        300: "#84C08A",
        400: "#5BAB64",
        500: "#369841",
        600: "#2B7A34",
        700: "#205B27",
        800: "#163D1A",
        900: "#0B1E0D",
      },

      accent: {
        100: "#DDF5FE",
        200: "#B9E1FA",
        300: "#92D1F7",
        400: "#5CB5F6",
        500: "#369841",
        600: "#2B7A34",
        700: "#205B27",
        800: "#163D1A",
        900: "#0B1E0D",
      },

      gray: {
        100: "#F3F4F6",
        200: "#E5E7EB",
        300: "#D1D5DB",
        400: "#9CA3AF",
        500: "#6B7280",
        600: "#4B5563",
        700: "#374151",
      },

      // Semânticas principais
      text: "#14273D",
      titleColor: "#14273D",
      muted: "#6B7280",

      footer: "#004A80",
      buttonDetails: "#004A80",
      titleHighlight: "#004A80",

      lightBlock: "#DDF5FE",
      background: "#FFFFFF",
      surface: "#F3F4F6",

      gradientFrom: "#004A80",
      gradientTo: "#5CB5F6",

      // Compatibilidade com componentes antigos
      highlight: "#369841",
      softBackground: "#DDF5FE",
      pastel: "#5CB5F6",
      gold: "#369841",
      brandBlue: "#004A80",
      brandPink: "#369841",
    },
    plansTheme: {
      pageBg: "#EAF4FF",
      cardHeaderBg: "#DDF5FE",
      recommendedCardBg: "#004A80",
      recommendedCardText: "#FFFFFF",
      badgeBg: "#369841",
      badgeText: "#FFFFFF",
      buttonRecommended: "#369841",
      buttonDefault: "#004A80",
      featureCheckColor: "#369841",
      titleColor: "#14273D",
      subtitleColor: "#6B7280",
      summaryCardBg: "#004A80",
      ctaButtonBg: "#369841",
      selectedOptionColor: "#004A80",
      infoBannerBg: "#DDF5FE",
      infoBannerBorder: "#B3D5E6",
      infoBannerText: "#14273D",
    },
  },

  ES: {
    state: "ES",
    logo: "/logo_es.svg",
    map: "/images/Floating State Map Espirito (Visual decoration).png",
    heroImage: "/images/hero-es.png",

    texts: {
      title: "Sobre a Plataforma SIAPESQ-ES",
      subtitle:
        "Ciência e tecnologia a serviço da biodiversidade do Espírito Santo.",
      description:
        "O SIAPESQ-ES monitora a rica biodiversidade capixaba, acompanhando espécies da Mata Atlântica, manguezais e ecossistemas costeiros únicos, garantindo a preservação ambiental do estado.",
      mission:
        "Produzir dados científicos precisos e ferramentas de monitoramento para apoiar políticas públicas, proteção ambiental e o uso sustentável da biodiversidade do Espírito Santo.",
      vision:
        "Ser a principal referência estadual em inteligência de dados aplicada à conservação da biodiversidade, integrando ciência participativa, tecnologia e inovação para um futuro sustentável no ES.",
    },

    colors: {
      primary: {
        100: "#D2E1EF",
        200: "#A5C3E0",
        300: "#79A5D0",
        400: "#3B82F6",
        500: "#1F69B1",
        600: "#19548E",
        700: "#133F6A",
        800: "#0C2A47",
        900: "#061523",
      },

      secondary: {
        100: "#FCE1EE",
        200: "#FAC4DD",
        300: "#F7A6CC",
        400: "#F589BB",
        500: "#F26BAA",
        600: "#C25688",
        700: "#914066",
        800: "#612B44",
        900: "#301522",
      },

      accent: {
        100: "#FCE1EE",
        200: "#FAC4DD",
        300: "#F7A6CC",
        400: "#F589BB",
        500: "#F26BAA",
        600: "#C25688",
        700: "#914066",
        800: "#612B44",
        900: "#301522",
      },

      gray: {
        100: "#F3F4F6",
        200: "#E5E7EB",
        300: "#D1D5DB",
        400: "#9CA3AF",
        500: "#6B7280",
        600: "#43474F",
        700: "#2C3440",
      },

      // Semânticas principais
      text: "#43474F",
      titleColor: "#1F69B1",
      muted: "#43474F",

      footer: "#1F69B1",
      buttonDetails: "#F26BAA",
      titleHighlight: "#F26BAA",

      lightBlock: "#FFFFFF",
      background: "#FFFFFF",
      surface: "#F3F4F6",

      gradientFrom: "#1F69B1",
      gradientTo: "#F26BAA",

      // Compatibilidade com componentes antigos
      highlight: "#F26BAA",
      softBackground: "#FFFFFF",
      pastel: "#FF7E80",
      gold: "#F26BAA",
      brandBlue: "#1F69B1",
      brandPink: "#F26BAA",
    },
    plansTheme: {
      pageBg: "#EBF3FB",
      cardHeaderBg: "#D2E1EF",
      recommendedCardBg: "#1F69B1",
      recommendedCardText: "#FFFFFF",
      badgeBg: "#F26BAA",
      badgeText: "#FFFFFF",
      buttonRecommended: "#F26BAA",
      buttonDefault: "#1F69B1",
      featureCheckColor: "#F26BAA",
      titleColor: "#1F69B1",
      subtitleColor: "#667085",
      summaryCardBg: "#1F69B1",
      ctaButtonBg: "#F26BAA",
      selectedOptionColor: "#1F69B1",
      infoBannerBg: "#D2E1EF",
      infoBannerBorder: "#A5C3E0",
      infoBannerText: "#133F6A",
    },
  },

  MG: {
    state: "MG",
    logo: "/logo_mg.svg",
    map: "/images/Floating State Map MG (Visual decoration).png",
    heroImage: "/images/hero-mg.png",

    texts: {
      title: "Sobre a Plataforma SIAPESQ-MG",
      subtitle:
        "Ciência e tecnologia a serviço da biodiversidade de Minas Gerais.",
      description:
        "O SIAPESQ-MG monitora a biodiversidade mineira abrangendo o Cerrado, a Mata Atlântica e os campos rupestres, acompanhando espécies endêmicas e ameaçadas de extinção em todo o território estadual.",
      mission:
        "Monitorar e proteger a biodiversidade mineira por meio de tecnologia e ciência aplicada.",
      vision:
        "Ser referência em inteligência ambiental para a conservação dos ecossistemas de Minas Gerais.",
    },

    colors: {
      primary: {
        100: "#E9D0D1",
        200: "#D3A1A2",
        300: "#BE7374",
        400: "#A84446",
        500: "#921617",
        600: "#7B1213",
        700: "#5C0D0E",
        800: "#3E090A",
        900: "#1F0405",
      },

      secondary: {
        100: "#F9EDD9",
        200: "#E0D9D7",
        300: "#C1B4B0",
        400: "#836961",
        500: "#312421",
        600: "#271D1A",
        700: "#1D1614",
        800: "#140E0D",
        900: "#0A0707",
      },

      accent: {
        100: "#FFE5E5",
        200: "#FFBDBD",
        300: "#FF9999",
        400: "#FF7E80",
        500: "#FF7E80",
        600: "#D65F61",
        700: "#A84446",
        800: "#921617",
        900: "#5C0D0E",
      },

      gray: {
        100: "#F1F5F9",
        200: "#E5E7EB",
        300: "#C3C6D1",
        400: "#9CA3AF",
        500: "#43474F",
        600: "#43474F",
        700: "#312421",
      },

      // Semânticas principais
      text: "#312421",
      titleColor: "#312421",
      muted: "#43474F",

      footer: "#921617",
      buttonDetails: "#921617",
      titleHighlight: "#921617",

      lightBlock: "#F9EDD9",
      background: "#FFFFFF",
      surface: "#F9EDD9",

      gradientFrom: "#921617",
      gradientTo: "#FF7E80",

      // Compatibilidade com componentes antigos
      highlight: "#921617",
      softBackground: "#F9EDD9",
      pastel: "#F9EDD9",
      gold: "#B58121",
      brandBlue: "#921617",
      brandPink: "#FF7E80",
    },

    plansTheme: {
      pageBg: "#FDF8EF",
      cardHeaderBg: "#F9EDD9",
      recommendedCardBg: "#921617",
      recommendedCardText: "#FFFFFF",
      badgeBg: "#B58121",
      badgeText: "#FFFFFF",
      buttonRecommended: "#B58121",
      buttonDefault: "#921617",
      featureCheckColor: "#921617",
      titleColor: "#312421",
      subtitleColor: "#43474F",
      summaryCardBg: "#921617",
      ctaButtonBg: "#B58121",
      selectedOptionColor: "#921617",
      infoBannerBg: "#F9EDD9",
      infoBannerBorder: "#E0D9D7",
      infoBannerText: "#312421",
    },
  },
} as const;
    

export type PlatformTheme =
  (typeof platformThemes)[keyof typeof platformThemes];

export const getPlatformTheme = (state: PlatformState = "RS") =>
  platformThemes[state];