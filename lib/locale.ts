export const SUPPORTED_LOCALES = ["en", "es", "fr"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const APP_LOCALE_COOKIE = "pat-locale";

export const localeOptions: Array<{ code: AppLocale; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

export type HeaderNavLabelKey =
  | "home"
  | "meet_pat"
  | "sign_in"
  | "vendor"
  | "firm"
  | "individual"
  | "survey"
  | "results"
  | "insights"
  | "platform"
  | "c2core";

type InsightLocaleBundle = {
  shared: {
    visible: string;
    pending: string;
    locked: string;
    sample: string;
    confidence: string;
    freshness: string;
    whatItIs: string;
    whyItMatters: string;
    howToUseIt: string;
    assessmentBasis: string;
    exactAssessmentBasis: string;
    confidenceAndSampleCaveat: string;
    strongestContributingModules: string;
    weakestContributingModules: string;
    contributingCapabilities: string;
    notableQuestionClusters: string;
    moduleEvidence: string;
    capabilityAndQuestionEvidence: string;
    noCompletedModuleEvidenceYet: string;
    questionClusterEvidenceNotAvailable: string;
    basisEnglishOnlyNote: string;
  };
  firm: {
    title: string;
    heroTitle: string;
    heroBody: string;
    currentStateNote: string;
    modulesCompleted: string;
    productReviewsSubmitted: string;
    latestModuleAverage: string;
    proTitle: string;
    proBody: string;
    eliteTitle: string;
    eliteBody: string;
    proAvailableLabel: string;
    proPendingLabel: string;
    unlockRequirement: string;
    unlockBody: string;
    backToInsights: string;
    openAlignmentAssessment: string;
  };
  vendorAlignment: {
    title: string;
    heroTitle: string;
    heroBody: string;
    firmsInSignalBase: string;
    currentPatModuleAverage: string;
    moduleVariance: string;
    confidence: string;
    proTitle: string;
    proBody: string;
    eliteTitle: string;
    eliteBody: string;
    assessmentBasis: string;
    backToAlignmentInsights: string;
  };
  vendorProduct: {
    title: string;
    heroTitle: string;
    heroBody: string;
    heroNote: string;
    backToVendorHome: string;
    openProductAssessment: string;
    noProducts: string;
    vendorSelfReportedSignal: string;
    firmReviewedSignal: string;
    combinedPatReadout: string;
    productBasis: string;
    proTitle: string;
    proBody: string;
    eliteTitle: string;
    eliteBody: string;
    backToProductCatalog: string;
    basisTemplateLabel: string;
  };
};

type LocaleMessages = {
  nav: Record<HeaderNavLabelKey, string>;
  chrome: Record<
    | "home_aria"
    | "language"
    | "membership"
    | "navigation"
    | "open_language_menu"
    | "open_navigation_menu"
    | "close_navigation_menu"
    | "copyright"
    | "pat",
    string
  >;
  common: {
    scoped: string;
    queued: string;
    workspace: string;
    admin: string;
    help: string;
    profile: string;
    backToHome: string;
    signInToPat: string;
    continueToSignIn: string;
    continueWithGitHub: string;
    continueWithAccessCode: string;
    reviewLocalAuthSetup: string;
    enterAccessCode: string;
    saveIndividualProfile: string;
    notSignedIn: string;
    guest: string;
    unbound: string;
  };
  home: {
    productName: string;
    eyebrow: string;
    heroTitle: string;
    heroBody: string;
    welcomeLabel: string;
    meetPatTitle: string;
    meetPatBody: string;
    meetPatCta: string;
    signInLabel: string;
    signInTitle: string;
    signedInCopy: string;
    signedOutCopy: string;
  };
  signIn: {
    metaTitle: string;
    eyebrow: string;
    heroTitle: string;
    heroBody: string;
    vendor: string;
    firm: string;
    individual: string;
    invitee: string;
    meetPat: string;
    help: string;
    roleBody: string;
    vendorTitle: string;
    vendorSubtitle: string;
    firmTitle: string;
    firmSubtitle: string;
    individualTitle: string;
    individualSubtitle: string;
    inviteeTitle: string;
    inviteeSubtitle: string;
    helpEyebrow: string;
    helpTitle: string;
    helpBody: string;
    helpCards: Array<{ title: string; body: string }>;
    callbackTarget: string;
    githubAuth: string;
    authAvailable: string;
    authNeedsConfig: string;
    inviteeAccess: string;
    enabled: string;
    disabled: string;
    localAuthCookies: string;
  };
  meetPat: {
    eyebrow: string;
    heroTitle: string;
    heroBody: string;
    sections: Array<{ title: string; body: string }>;
    valueTitle: string;
    valueBody: string;
  };
  portal: {
    firm: {
      eyebrow: string;
      title: string;
      body: string;
      account: string;
      modulesCompleted: string;
      productReviewLoop: string;
    };
    vendor: {
      eyebrow: string;
      title: string;
      body: string;
      compatibilityMode: string;
      currentVendorContext: string;
      account: string;
      vendorCompany: string;
      products: string;
    };
    individual: {
      eyebrow: string;
      title: string;
      body: string;
      individualProfile: string;
      profileTitle: string;
      profileBody: string;
      profileSettings: string;
      currentSignedInAccount: string;
      account: string;
      role: string;
      audience: string;
      patSubjectLink: string;
      individualAlignment: string;
      completed: string;
      pending: string;
      connected: string;
      fallback: string;
      unavailable: string;
      audienceMismatch: string;
      companyContext: string;
      assessmentCount: string;
      latestScore: string;
      signInToEdit: string;
    };
    cards: {
      firm: Record<string, { title: string; description: string }>;
      vendor: Record<string, { title: string; description: string }>;
      individual: Record<string, { title: string; description: string }>;
    };
  };
  insights: InsightLocaleBundle;
};

const messages: Record<AppLocale, LocaleMessages> = {
  en: {
    nav: {
      home: "Home",
      meet_pat: "Meet PAT",
      sign_in: "Sign in",
      vendor: "Vendor",
      firm: "Firm",
      individual: "Individual",
      survey: "Survey",
      results: "Results",
      insights: "Insights",
      platform: "Platform",
      c2core: "C2Core",
    },
    chrome: {
      home_aria: "Open home",
      language: "Language",
      membership: "Membership",
      navigation: "Navigation",
      open_language_menu: "Open language menu",
      open_navigation_menu: "Open navigation menu",
      close_navigation_menu: "Close navigation menu",
      copyright: "Copyright 2026 C2Acct",
      pat: "PAT — Performance Alignment Technology · a Patalign\u2122 product",
    },
    common: {
      scoped: "Scoped",
      queued: "Queued",
      workspace: "Workspace",
      admin: "Admin",
      help: "Help",
      profile: "Profile",
      backToHome: "Back to home",
      signInToPat: "Sign in to PAT",
      continueToSignIn: "Continue to sign-in",
      continueWithGitHub: "Continue with GitHub",
      continueWithAccessCode: "Continue with access code",
      reviewLocalAuthSetup: "Review local auth setup",
      enterAccessCode: "Enter access code",
      saveIndividualProfile: "Save individual profile",
      notSignedIn: "Not signed in",
      guest: "Guest",
      unbound: "Unbound",
    },
    home: {
      productName: "Performance Alignment Technology",
      eyebrow: "PAT intelligence layer",
      heroTitle: "The intelligence layer inside C2Acct",
      heroBody:
        "PAT is the intelligence layer within C2Acct, designed to transform structured signals into usable, decision-grade insight with minimal friction and full contextual continuity.",
      welcomeLabel: "WELCOME",
      meetPatTitle: "Meet PAT",
      meetPatBody:
        "Understand how PAT turns assessments, capability signal, and product evidence into current-state decision support.",
      meetPatCta: "Learn more about PAT",
      signInLabel: "Choose your path",
      signInTitle: "Continue to sign in",
      signedInCopy: "You are signed in. Choose your path to access your designed workspace.",
      signedOutCopy:
        "Vendors, firms, and individuals sign in here to access their PAT workspace. Role-based dashboards and assessments begin after sign-in.",
    },
    signIn: {
      metaTitle: "Sign In | Patalign",
      eyebrow: "SIGN-IN",
      heroTitle: "SIGN-IN",
      heroBody: "Select the path that aligns with your role. Access the insights that matter most to you.",
      vendor: "Vendor",
      firm: "Firm",
      individual: "Individual",
      invitee: "Invitee",
      meetPat: "Meet PAT",
      help: "Help",
      roleBody:
        "Access simple, secure, and consistent insights. Use the existing login and continue into the platform without interruption.",
      vendorTitle: "VENDOR SIGN-IN",
      vendorSubtitle: "Enter PAT through the vendor path",
      firmTitle: "FIRM SIGN-IN",
      firmSubtitle: "Enter PAT through the firm path",
      individualTitle: "INDIVIDUAL SIGN-IN",
      individualSubtitle: "Enter PAT through the individual path",
      inviteeTitle: "INVITEE SIGN-IN",
      inviteeSubtitle: "Enter PAT through the invitee path",
      helpEyebrow: "Help",
      helpTitle: "How to use this sign-in page",
      helpBody:
        "Each toggle on this page explains a specific entry path. Choose the route that matches your audience, review Meet PAT inline if you need product context first, or use Help to understand what each option is for before continuing.",
      helpCards: [
        { title: "Vendor", body: "Use Vendor for product assessment, product insight, and vendor alignment insight review." },
        { title: "Firm", body: "Use Firm for alignment assessment, product assessment, and firm insight review." },
        { title: "Individual", body: "Use Individual for the person-level PAT scaffold and profile context." },
        { title: "Invitee", body: "Use Invitee when you were given a controlled access code for staged or local review." },
        { title: "Meet PAT", body: "Use Meet PAT when you want the full PAT explainer inline before choosing a sign-in route." },
        { title: "Help", body: "Use Help when you need guidance about what each sign-in option does." },
      ],
      callbackTarget: "Callback target",
      githubAuth: "GitHub auth",
      authAvailable: "Available",
      authNeedsConfig: "Needs local configuration",
      inviteeAccess: "Invitee access",
      enabled: "Enabled",
      disabled: "Disabled",
      localAuthCookies: "Local auth cookies",
    },
    meetPat: {
      eyebrow: "Meet PAT",
      heroTitle: "PAT is the intelligence layer for structured performance alignment.",
      heroBody:
        "PAT turns assessments, capability signal, and product evidence into reflective current-state insight, then expands responsibly as the model and evidence deepen.",
      sections: [
        {
          title: "What PAT does",
          body: "PAT captures structured operating and product signals, preserves context, and turns those signals into actionable interpretation across firm, vendor, and individual views.",
        },
        {
          title: "Why it matters",
          body: "The model is useful because it keeps assessment, capability, and insight layers connected instead of scattering them across disconnected routes and generic summaries.",
        },
        {
          title: "How PAT grows",
          body: "PAT starts with current-state interpretation, then expands into stronger recommendation, comparison, and projection layers only when the underlying evidence is honest enough to support them.",
        },
      ],
      valueTitle: "Instant Value",
      valueBody:
        "The assessment is how PAT begins, not all that PAT is. The real asset is the intelligence layer that turns operating and product signals into reflective insight now, then expands into stronger recommendation and comparison layers as the model and data deepen.",
    },
    portal: {
      firm: {
        eyebrow: "Firm portal",
        title: "Your firm workspace in PAT",
        body:
          "Unlock a more connected firm experience with streamlined access to assessments, operational tools, and the insights needed to move work forward with confidence.",
        account: "Firm account",
        modulesCompleted: "Modules completed",
        productReviewLoop: "Product review loop",
      },
      vendor: {
        eyebrow: "Vendor portal",
        title: "Your vendor workspace in PAT",
        body:
          "Unlock a more connected vendor experience with streamlined access to assessments, operational tools, and the insights needed to move work forward with confidence.",
        compatibilityMode:
          "Vendor taxonomy/profile tables are not fully available in the local database yet. The route architecture is already in place, but vendor data persistence depends on the current Prisma schema being applied.",
        currentVendorContext: "Current vendor context",
        account: "Account",
        vendorCompany: "Vendor company",
        products: "Products",
      },
      individual: {
        eyebrow: "Individual portal",
        title: "Your individual workspace for PAT",
        body:
          "Unlock a more connected individual experience with streamlined access to assessments, operational tools, and the insights needed to move work forward with confidence.",
        individualProfile: "Individual profile",
        profileTitle: "Clean profile scaffold for the next PAT phase",
        profileBody:
          "This page stays intentionally clean, but it now supports editable person-level PAT contact and profile settings without inventing a second account system.",
        profileSettings: "Profile settings",
        currentSignedInAccount: "Current signed-in account",
        account: "Account",
        role: "Role",
        audience: "Audience",
        patSubjectLink: "PAT subject link",
        individualAlignment: "Individual alignment",
        completed: "Completed",
        pending: "Pending",
        connected: "Connected",
        fallback: "Fallback path",
        unavailable: "Unavailable",
        audienceMismatch:
          "Your current signed-in PAT context is not bound to the individual audience. These routes are still reviewable now, but deeper person-native behavior will remain gated until the dedicated individual flow is built.",
        companyContext: "Company context",
        assessmentCount: "Assessment count",
        latestScore: "Latest score",
        signInToEdit: "Sign in to edit the current individual profile settings.",
      },
      cards: {
        firm: {
          "firm-alignment-assessment": {
            title: "Alignment Assessment",
            description: "Open the 5-module, 100-question firm alignment system and track progress by module.",
          },
          "firm-product-assessments": {
            title: "Product Assessment",
            description: "Review vendor products through feature-aligned firm product assessments that feed vendor product insight.",
          },
          "firm-insights": {
            title: "Alignment Insights",
            description: "Open firm-facing Pro and Elite PAT alignment insights based on current firm and product alignment signal.",
          },
        },
        vendor: {
          "product-assessment": {
            title: "Product Assessment",
            description: "Select a software product, declare the features it solves, and run the per-product PAT assessment.",
          },
          "product-insight": {
            title: "Product Insight",
            description: "Open the product intelligence catalog and review standalone product insight pages.",
          },
          "alignment-insights": {
            title: "Alignment Insight",
            description: "Review Pro membership and Elite membership vendor alignment insight groups tied to firm alignment signal.",
          },
        },
        individual: {
          "individual-alignment-assessment": {
            title: "Alignment Assessment",
            description: "Open the current person-level PAT alignment assessment and carry the saved signal into individual insight visibility.",
          },
          "individual-product-assessment": {
            title: "Product Assessment",
            description: "Open the individual product-review route scaffold tied to future person-native product signal.",
          },
          "individual-insights": {
            title: "Insights",
            description: "Review the individual-facing insight route structure and Pro membership / Elite membership PAT framing.",
          },
        },
      },
    },
    insights: {
      shared: {
        visible: "Visible",
        pending: "Pending",
        locked: "Locked",
        sample: "Sample",
        confidence: "Confidence",
        freshness: "Freshness",
        whatItIs: "What it is",
        whyItMatters: "Why it matters",
        howToUseIt: "How to use it",
        assessmentBasis: "Assessment basis",
        exactAssessmentBasis: "Exact Assessment Basis",
        confidenceAndSampleCaveat: "Confidence And Sample Caveat",
        strongestContributingModules: "Strongest Contributing Modules",
        weakestContributingModules: "Weakest Contributing Modules",
        contributingCapabilities: "Contributing Capabilities",
        notableQuestionClusters: "Notable Question Clusters",
        moduleEvidence: "Module Evidence",
        capabilityAndQuestionEvidence: "Capability And Question Evidence",
        noCompletedModuleEvidenceYet: "No completed module evidence yet.",
        questionClusterEvidenceNotAvailable: "Question-cluster evidence is not available yet.",
        basisEnglishOnlyNote:
          "Current-state evidence summaries may still render in English while broader insight localization is completed.",
      },
      firm: {
        title: "Firm Alignment Insights | Patalign",
        heroTitle: "Firm alignment insights",
        heroBody:
          "Use this page to review what your current PAT alignment evidence says about operating strength, automation readiness, data and controls, and change readiness.",
        currentStateNote:
          "PAT uses current firm module and product-review evidence only. It does not claim benchmark or forecast support here.",
        modulesCompleted: "Modules completed",
        productReviewsSubmitted: "Product reviews submitted",
        latestModuleAverage: "Latest module average",
        proTitle: "Pro Insights",
        proBody:
          "Open these cards for grounded current-state firm readouts tied to current PAT evidence.",
        eliteTitle: "Elite Insights",
        eliteBody: "Coming soon. Unlock with Elite membership.",
        proAvailableLabel:
          "Available now from completed firm alignment coverage plus the required capability signal.",
        proPendingLabel:
          "Requires all five firm alignment modules plus the relevant capability thresholds for this insight theme.",
        unlockRequirement: "Unlock requirement",
        unlockBody:
          "Complete all five firm alignment modules and meet the capability thresholds tied to this insight theme. Module-completion badges prove coverage; capability scores determine whether the Pro interpretation is grounded enough to show.",
        backToInsights: "Back to firm alignment insights",
        openAlignmentAssessment: "Open alignment assessment",
      },
      vendorAlignment: {
        title: "Vendor Alignment Insights | Patalign",
        heroTitle: "Vendor alignment insights",
        heroBody:
          "Use this page to understand what the current firm alignment signal says about the operating conditions vendors are likely walking into right now.",
        firmsInSignalBase: "Firms in signal base",
        currentPatModuleAverage: "Current PAT module average",
        moduleVariance: "Module variance",
        confidence: "Confidence",
        proTitle: "Pro membership",
        proBody: "Grounded current-state vendor intelligence tied to current firm PAT signal.",
        eliteTitle: "Elite membership",
        eliteBody: "Coming soon. Unlock with Elite membership.",
        assessmentBasis: "Assessment basis",
        backToAlignmentInsights: "Back to alignment insights",
      },
      vendorProduct: {
        title: "Vendor Product Insight | Patalign",
        heroTitle: "Product intelligence catalog",
        heroBody:
          "Only products with a completed vendor product assessment appear here. Open one product to review its current product intelligence.",
        heroNote:
          "Product intelligence stays focused on current product signal rather than benchmark or forecast claims.",
        backToVendorHome: "Back to vendor home",
        openProductAssessment: "Open product assessment",
        noProducts:
          "No vendor products are available yet. Add products from the product assessment route to start building product intelligence.",
        vendorSelfReportedSignal: "Vendor Self-Reported Signal",
        firmReviewedSignal: "Firm-Reviewed Signal",
        combinedPatReadout: "Combined Current PAT Readout",
        productBasis: "Product Basis",
        proTitle: "Pro membership insights",
        proBody:
          "Each insight keeps vendor self-report, firm review, and combined PAT interpretation distinct.",
        eliteTitle: "Elite membership insights",
        eliteBody: "Coming soon. Unlock with Elite membership.",
        backToProductCatalog: "Back to product catalog",
        basisTemplateLabel: "Basis template",
      },
    },
  },
  es: {
    nav: {
      home: "Inicio",
      meet_pat: "Conoce PAT",
      sign_in: "Ingresar",
      vendor: "Proveedor",
      firm: "Firma",
      individual: "Individual",
      survey: "Encuesta",
      results: "Resultados",
      insights: "Insights",
      platform: "Plataforma",
      c2core: "C2Core",
    },
    chrome: {
      home_aria: "Abrir inicio",
      language: "Idioma",
      membership: "Membresia",
      navigation: "Navegación",
      open_language_menu: "Abrir menú de idioma",
      open_navigation_menu: "Abrir menú de navegación",
      close_navigation_menu: "Cerrar menú de navegación",
      copyright: "Copyright 2026 C2Acct",
      pat: "PAT — Performance Alignment Technology · a Patalign\u2122 product",
    },
    common: {
      scoped: "Acotado",
      queued: "En cola",
      workspace: "Espacio de trabajo",
      admin: "Admin",
      help: "Ayuda",
      profile: "Perfil",
      backToHome: "Volver al inicio",
      signInToPat: "Ingresar a PAT",
      continueToSignIn: "Continuar al acceso",
      continueWithGitHub: "Continuar con GitHub",
      continueWithAccessCode: "Continuar con código de acceso",
      reviewLocalAuthSetup: "Revisar configuración local de autenticación",
      enterAccessCode: "Ingresar código de acceso",
      saveIndividualProfile: "Guardar perfil individual",
      notSignedIn: "Sin sesión",
      guest: "Invitado",
      unbound: "Sin vincular",
    },
    home: {
      productName: "Performance Alignment Technology",
      eyebrow: "Capa de inteligencia PAT",
      heroTitle: "La capa de inteligencia dentro de C2Acct",
      heroBody:
        "PAT es la capa de inteligencia dentro de C2Acct, diseñada para convertir señales estructuradas en insights utilizables y aptos para la toma de decisiones con fricción mínima y continuidad contextual completa.",
      welcomeLabel: "BIENVENIDA",
      meetPatTitle: "Conoce PAT",
      meetPatBody:
        "Entiende cómo PAT convierte evaluaciones, señales de capacidad y evidencia de producto en apoyo de decisión del estado actual.",
      meetPatCta: "Conocer más sobre PAT",
      signInLabel: "Elige tu ruta",
      signInTitle: "Elige tu ruta",
      signedInCopy: "Ya has iniciado sesión. Elige tu ruta para acceder a tu espacio de trabajo diseñado.",
      signedOutCopy:
        "Proveedores, firmas e individuos ingresan aquí para acceder a su espacio de trabajo PAT. Los paneles y evaluaciones por rol comienzan después del acceso.",
    },
    signIn: {
      metaTitle: "Ingresar | Patalign",
      eyebrow: "ACCESO",
      heroTitle: "ACCESO",
      heroBody: "Selecciona la ruta que corresponde a tu rol. Accede a los insights que más importan.",
      vendor: "Proveedor",
      firm: "Firma",
      individual: "Individual",
      invitee: "Invitado",
      meetPat: "Conoce PAT",
      help: "Ayuda",
      roleBody:
        "Accede a insights simples, seguros y consistentes. Usa el acceso existente y continúa a la plataforma sin interrupciones.",
      vendorTitle: "ACCESO PROVEEDOR",
      vendorSubtitle: "Entrar a PAT por la ruta del proveedor",
      firmTitle: "ACCESO FIRMA",
      firmSubtitle: "Entrar a PAT por la ruta de la firma",
      individualTitle: "ACCESO INDIVIDUAL",
      individualSubtitle: "Entrar a PAT por la ruta individual",
      inviteeTitle: "ACCESO INVITADO",
      inviteeSubtitle: "Entrar a PAT por la ruta de invitado",
      helpEyebrow: "Ayuda",
      helpTitle: "Cómo usar esta página de acceso",
      helpBody:
        "Cada selector de esta página explica una ruta de entrada específica. Elige la ruta que coincide con tu audiencia, revisa Conoce PAT en línea si primero necesitas contexto del producto, o usa Ayuda para entender para qué sirve cada opción antes de continuar.",
      helpCards: [
        { title: "Proveedor", body: "Usa Proveedor para evaluación de producto, insight de producto y revisión de insights de alineación para proveedores." },
        { title: "Firma", body: "Usa Firma para evaluación de alineación, evaluación de producto y revisión de insights de firma." },
        { title: "Individual", body: "Usa Individual para la estructura PAT a nivel persona y el contexto de perfil." },
        { title: "Invitado", body: "Usa Invitado cuando recibiste un código de acceso controlado para una revisión local o en entorno." },
        { title: "Conoce PAT", body: "Usa Conoce PAT cuando quieras ver el explicador completo de PAT antes de elegir una ruta de acceso." },
        { title: "Ayuda", body: "Usa Ayuda cuando necesites orientación sobre lo que hace cada opción de acceso." },
      ],
      callbackTarget: "Destino de retorno",
      githubAuth: "Autenticación GitHub",
      authAvailable: "Disponible",
      authNeedsConfig: "Necesita configuración local",
      inviteeAccess: "Acceso de invitado",
      enabled: "Habilitado",
      disabled: "Deshabilitado",
      localAuthCookies: "Cookies locales de autenticación",
    },
    meetPat: {
      eyebrow: "Conoce PAT",
      heroTitle: "PAT es la capa de inteligencia para la alineación estructurada del desempeño.",
      heroBody:
        "PAT convierte evaluaciones, señales de capacidad y evidencia de producto en insights reflexivos del estado actual, y luego se expande de forma responsable a medida que el modelo y la evidencia maduran.",
      sections: [
        {
          title: "Qué hace PAT",
          body: "PAT captura señales estructuradas operativas y de producto, preserva el contexto y convierte esas señales en interpretación lista para decisión en vistas de firma, proveedor e individuo.",
        },
        {
          title: "Por qué importa",
          body: "El modelo es útil porque mantiene conectadas las capas de evaluación, capacidad e insight en lugar de dispersarlas en rutas desconectadas y resúmenes genéricos.",
        },
        {
          title: "Cómo crece PAT",
          body: "PAT comienza con interpretación del estado actual y solo se expande a capas más fuertes de recomendación, comparación y proyección cuando la evidencia subyacente es lo bastante sólida.",
        },
      ],
      valueTitle: "Valor inmediato",
      valueBody:
        "La evaluación es cómo comienza PAT, no todo lo que PAT es. El activo real es la capa de inteligencia que convierte señales operativas y de producto en insight reflexivo ahora, y luego se amplía hacia capas más fuertes de recomendación y comparación a medida que el modelo y los datos profundizan.",
    },
    portal: {
      firm: {
        eyebrow: "Portal de firma",
        title: "Tu espacio de trabajo de firma en PAT",
        body:
          "Desbloquea una experiencia de firma más conectada con acceso ágil a evaluaciones, herramientas operativas e insights para avanzar el trabajo con confianza.",
        account: "Cuenta de firma",
        modulesCompleted: "Módulos completados",
        productReviewLoop: "Ciclo de revisión de productos",
      },
      vendor: {
        eyebrow: "Portal de proveedor",
        title: "Tu espacio de trabajo de proveedor en PAT",
        body:
          "Desbloquea una experiencia de proveedor más conectada con acceso ágil a evaluaciones, herramientas operativas e insights para avanzar el trabajo con confianza.",
        compatibilityMode:
          "Las tablas de taxonomía/perfil de proveedor todavía no están completamente disponibles en la base de datos local. La arquitectura de rutas ya está en su lugar, pero la persistencia de datos del proveedor depende del esquema actual de Prisma.",
        currentVendorContext: "Contexto actual del proveedor",
        account: "Cuenta",
        vendorCompany: "Empresa proveedora",
        products: "Productos",
      },
      individual: {
        eyebrow: "Portal individual",
        title: "Tu espacio de trabajo individual para PAT",
        body:
          "Desbloquea una experiencia individual más conectada con acceso ágil a evaluaciones, herramientas operativas e insights para avanzar el trabajo con confianza.",
        individualProfile: "Perfil individual",
        profileTitle: "Base limpia de perfil para la siguiente fase de PAT",
        profileBody:
          "Esta página se mantiene intencionalmente limpia, pero ahora admite configuración editable de contacto y perfil PAT a nivel persona sin inventar un segundo sistema de cuenta.",
        profileSettings: "Configuración de perfil",
        currentSignedInAccount: "Cuenta actual con sesión iniciada",
        account: "Cuenta",
        role: "Rol",
        audience: "Audiencia",
        patSubjectLink: "Vínculo PAT",
        individualAlignment: "Alineación individual",
        completed: "Completado",
        pending: "Pendiente",
        connected: "Conectado",
        fallback: "Ruta alternativa",
        unavailable: "No disponible",
        audienceMismatch:
          "Tu contexto PAT actual con sesión iniciada no está vinculado a la audiencia individual. Estas rutas siguen siendo revisables ahora, pero el comportamiento más profundo nativo de persona seguirá limitado hasta que se construya el flujo individual dedicado.",
        companyContext: "Contexto de empresa",
        assessmentCount: "Cantidad de evaluaciones",
        latestScore: "Puntaje más reciente",
        signInToEdit: "Inicia sesión para editar la configuración actual del perfil individual.",
      },
      cards: {
        firm: {
          "firm-alignment-assessment": {
            title: "Evaluación de alineación",
            description: "Abre el sistema de alineación de firma de 5 módulos y 100 preguntas y sigue el progreso por módulo.",
          },
          "firm-product-assessments": {
            title: "Evaluación de producto",
            description: "Revisa productos de proveedores mediante evaluaciones de producto alineadas por utilidad que alimentan el insight de producto del proveedor.",
          },
          "firm-insights": {
            title: "Insights de alineación",
            description: "Abre los insights PAT de alineación para firma, Pro y Elite, basados en la señal actual de alineación de firma y producto.",
          },
        },
        vendor: {
          "product-assessment": {
            title: "Evaluación de producto",
            description: "Selecciona un producto de software, declara las utilidades que resuelve y ejecuta la evaluación PAT por producto.",
          },
          "product-insight": {
            title: "Insight de producto",
            description: "Abre el catálogo de inteligencia de producto y revisa páginas independientes de insight de producto.",
          },
          "alignment-insights": {
            title: "Insight de alineación",
            description: "Revisa grupos de insights de alineación para proveedores de membresía Pro y Elite vinculados a la señal de alineación de firmas.",
          },
        },
        individual: {
          "individual-alignment-assessment": {
            title: "Evaluación de alineación",
            description: "Abre la evaluación activa de alineación PAT a nivel persona y lleva la señal guardada a la visibilidad de insights individuales.",
          },
          "individual-product-assessment": {
            title: "Evaluación de producto",
            description: "Abre la base de ruta de revisión de producto individual vinculada a futura señal de producto nativa de persona.",
          },
          "individual-insights": {
            title: "Insights",
            description: "Revisa la estructura de rutas de insight para individuos y el encuadre PAT de membresía Pro / Elite.",
          },
        },
      },
    },
    insights: {
      shared: {
        visible: "Visible",
        pending: "Pendiente",
        locked: "Bloqueado",
        sample: "Muestra",
        confidence: "Confianza",
        freshness: "Actualización",
        whatItIs: "Qué es",
        whyItMatters: "Por qué importa",
        howToUseIt: "Cómo usarlo",
        assessmentBasis: "Base de evaluación",
        exactAssessmentBasis: "Base exacta de la evaluación",
        confidenceAndSampleCaveat: "Confianza y advertencia de muestra",
        strongestContributingModules: "Módulos con mayor aporte",
        weakestContributingModules: "Módulos con menor aporte",
        contributingCapabilities: "Capacidades que contribuyen",
        notableQuestionClusters: "Clústeres de preguntas destacados",
        moduleEvidence: "Evidencia por módulo",
        capabilityAndQuestionEvidence: "Evidencia de capacidad y preguntas",
        noCompletedModuleEvidenceYet: "Todavía no hay evidencia de módulos completados.",
        questionClusterEvidenceNotAvailable: "La evidencia por clúster de preguntas aún no está disponible.",
        basisEnglishOnlyNote:
          "Los resúmenes de evidencia del estado actual todavía pueden mostrarse en inglés mientras se completa la localización más amplia de insights.",
      },
      firm: {
        title: "Insights de alineación de firma | Patalign",
        heroTitle: "Insights de alineación de firma basados en datos de alineación de firma y producto",
        heroBody:
          "Los insights Pro se desbloquean cuando la firma tiene cobertura completa de los cinco módulos y la fortaleza de capacidad que exige cada tema. Elite sigue visible como tarjetas restringidas para mostrar dónde se amplía la capa de inteligencia PAT.",
        currentStateNote:
          "El insight de firma sigue siendo solo interpretación PAT del estado actual. Cuando la cobertura de módulos o de capacidad es débil, la lectura se presenta como señal direccional y no como señal fuerte.",
        modulesCompleted: "Módulos completados",
        productReviewsSubmitted: "Revisiones de producto enviadas",
        latestModuleAverage: "Promedio más reciente por módulo",
        proTitle: "Insights Pro",
        proBody:
          "Insight PAT del estado actual que se vuelve visible después de completar los cinco módulos y cumplir los umbrales de capacidad relevantes.",
        eliteTitle: "Insights Elite",
        eliteBody: "Coming soon. Unlock with Elite membership.",
        proAvailableLabel:
          "Disponible ahora a partir de la cobertura completa de alineación de firma y la señal de capacidad requerida.",
        proPendingLabel:
          "Requiere los cinco módulos de alineación de firma y los umbrales de capacidad relevantes para este tema.",
        unlockRequirement: "Requisito de desbloqueo",
        unlockBody:
          "Completa los cinco módulos de alineación de firma y alcanza los umbrales de capacidad ligados a este tema. Las insignias de finalización prueban cobertura; los puntajes de capacidad determinan si la interpretación Pro es lo bastante sólida para mostrarse.",
        backToInsights: "Volver a insights de alineación de firma",
        openAlignmentAssessment: "Abrir evaluación de alineación",
      },
      vendorAlignment: {
        title: "Insights de alineación de proveedor | Patalign",
        heroTitle: "Señal PAT del lado proveedor basada en evidencia actual de evaluación de firmas",
        heroBody:
          "El catálogo Pro visible lee módulos PAT completados por firmas, dispersión entre módulos, clústeres de respuestas almacenadas y puntajes de capacidad cuando existen. Elite queda reservado donde el repositorio aún no tiene soporte honesto de benchmark, pronóstico o simulación.",
        firmsInSignalBase: "Firmas en la base de señal",
        currentPatModuleAverage: "Promedio actual de módulos PAT",
        moduleVariance: "Varianza entre módulos",
        confidence: "Confianza",
        proTitle: "Membresía Pro",
        proBody: "Inteligencia de proveedor del estado actual, vinculada a la señal PAT actual de firmas.",
        eliteTitle: "Membresía Elite",
        eliteBody: "Coming soon. Unlock with Elite membership.",
        assessmentBasis: "Base de evaluación",
        backToAlignmentInsights: "Volver a insights de alineación",
      },
      vendorProduct: {
        title: "Insight de producto del proveedor | Patalign",
        heroTitle: "Catálogo de inteligencia de producto",
        heroBody:
          "Cada página de producto separa la señal autodeclarada del proveedor de la señal revisada por firmas y muestra la lectura PAT combinada solo cuando la evidencia realmente la respalda.",
        heroNote:
          "El insight de producto sigue siendo evidencia PAT del estado actual. Una cobertura delgada de revisiones de firmas se muestra como señal direccional y no como fuerte confirmación de mercado.",
        backToVendorHome: "Volver al inicio del proveedor",
        openProductAssessment: "Abrir evaluación de producto",
        noProducts:
          "Todavía no hay productos de proveedor disponibles. Agrega productos desde la ruta de evaluación de producto para comenzar a construir inteligencia de producto.",
        vendorSelfReportedSignal: "Señal autodeclarada del proveedor",
        firmReviewedSignal: "Señal revisada por firmas",
        combinedPatReadout: "Lectura PAT actual combinada",
        productBasis: "Base del producto",
        proTitle: "Insights de membresía Pro",
        proBody:
          "Cada insight mantiene separadas la autoevaluación del proveedor, la revisión de firmas y la interpretación PAT combinada.",
        eliteTitle: "Insights de membresía Elite",
        eliteBody:
          "La membresía Elite sigue visible pero contenida hasta que exista una capa de evidencia más amplia. Estas tarjetas bloqueadas no implican que la inteligencia de benchmark o pronóstico ya esté activa.",
        backToProductCatalog: "Volver al catálogo de productos",
        basisTemplateLabel: "Plantilla de base",
      },
    },
  },
  fr: {
    nav: {
      home: "Accueil",
      meet_pat: "Découvrir PAT",
      sign_in: "Connexion",
      vendor: "Vendeur",
      firm: "Cabinet",
      individual: "Individuel",
      survey: "Évaluation",
      results: "Résultats",
      insights: "Insights",
      platform: "Plateforme",
      c2core: "C2Core",
    },
    chrome: {
      home_aria: "Ouvrir l’accueil",
      language: "Langue",
      membership: "Adhesion",
      navigation: "Navigation",
      open_language_menu: "Ouvrir le menu de langue",
      open_navigation_menu: "Ouvrir le menu de navigation",
      close_navigation_menu: "Fermer le menu de navigation",
      copyright: "Copyright 2026 C2Acct",
      pat: "PAT — Performance Alignment Technology · a Patalign\u2122 product",
    },
    common: {
      scoped: "Cadré",
      queued: "En attente",
      workspace: "Espace de travail",
      admin: "Admin",
      help: "Aide",
      profile: "Profil",
      backToHome: "Retour à l’accueil",
      signInToPat: "Se connecter à PAT",
      continueToSignIn: "Continuer vers la connexion",
      continueWithGitHub: "Continuer avec GitHub",
      continueWithAccessCode: "Continuer avec le code d’accès",
      reviewLocalAuthSetup: "Vérifier la configuration locale d’authentification",
      enterAccessCode: "Saisir le code d’accès",
      saveIndividualProfile: "Enregistrer le profil individuel",
      notSignedIn: "Non connecté",
      guest: "Invité",
      unbound: "Non lié",
    },
    home: {
      productName: "Performance Alignment Technology",
      eyebrow: "Couche d’intelligence PAT",
      heroTitle: "La couche d’intelligence au sein de C2Acct",
      heroBody:
        "PAT est la couche d’intelligence au sein de C2Acct, conçue pour transformer des signaux structurés en insight exploitable et utile à la décision avec un minimum de friction et une continuité contextuelle complète.",
      welcomeLabel: "BIENVENUE",
      meetPatTitle: "Découvrir PAT",
      meetPatBody:
        "Comprendre comment PAT transforme les évaluations, les signaux de capacité et les preuves produit en aide à la décision sur l’état actuel.",
      meetPatCta: "En savoir plus sur PAT",
      signInLabel: "Choisissez votre parcours",
      signInTitle: "Choisissez votre parcours",
      signedInCopy: "Vous êtes connecté. Choisissez votre parcours pour accéder à votre espace de travail conçu.",
      signedOutCopy:
        "Les vendeurs, cabinets et individus se connectent ici pour accéder à leur espace de travail PAT. Les tableaux de bord et évaluations par rôle commencent après la connexion.",
    },
    signIn: {
      metaTitle: "Connexion | Patalign",
      eyebrow: "CONNEXION",
      heroTitle: "CONNEXION",
      heroBody: "Sélectionnez le parcours adapté à votre rôle. Accédez aux insights qui comptent le plus.",
      vendor: "Vendeur",
      firm: "Cabinet",
      individual: "Individuel",
      invitee: "Invité",
      meetPat: "Découvrir PAT",
      help: "Aide",
      roleBody:
        "Accédez à des insights simples, sûrs et cohérents. Utilisez la connexion existante et poursuivez vers la plateforme sans interruption.",
      vendorTitle: "CONNEXION VENDEUR",
      vendorSubtitle: "Entrer dans PAT par le parcours vendeur",
      firmTitle: "CONNEXION CABINET",
      firmSubtitle: "Entrer dans PAT par le parcours cabinet",
      individualTitle: "CONNEXION INDIVIDUELLE",
      individualSubtitle: "Entrer dans PAT par le parcours individuel",
      inviteeTitle: "CONNEXION INVITÉ",
      inviteeSubtitle: "Entrer dans PAT par le parcours invité",
      helpEyebrow: "Aide",
      helpTitle: "Comment utiliser cette page de connexion",
      helpBody:
        "Chaque onglet de cette page explique un point d’entrée précis. Choisissez la route adaptée à votre audience, consultez Découvrir PAT en ligne si vous avez d’abord besoin de contexte produit, ou utilisez Aide pour comprendre le rôle de chaque option avant de continuer.",
      helpCards: [
        { title: "Vendeur", body: "Utilisez Vendeur pour l’évaluation produit, l’insight produit et la revue des insights d’alignement vendeur." },
        { title: "Cabinet", body: "Utilisez Cabinet pour l’évaluation d’alignement, l’évaluation produit et la revue des insights cabinet." },
        { title: "Individuel", body: "Utilisez Individuel pour la structure PAT au niveau personne et le contexte de profil." },
        { title: "Invité", body: "Utilisez Invité lorsque vous avez reçu un code d’accès contrôlé pour une revue locale ou intermédiaire." },
        { title: "Découvrir PAT", body: "Utilisez Découvrir PAT lorsque vous souhaitez consulter l’explicatif complet de PAT avant de choisir un parcours de connexion." },
        { title: "Aide", body: "Utilisez Aide lorsque vous avez besoin d’une explication sur le rôle de chaque option de connexion." },
      ],
      callbackTarget: "Cible de retour",
      githubAuth: "Authentification GitHub",
      authAvailable: "Disponible",
      authNeedsConfig: "Configuration locale requise",
      inviteeAccess: "Accès invité",
      enabled: "Activé",
      disabled: "Désactivé",
      localAuthCookies: "Cookies d’authentification locaux",
    },
    meetPat: {
      eyebrow: "Découvrir PAT",
      heroTitle: "PAT est la couche d’intelligence pour l’alignement structuré de la performance.",
      heroBody:
        "PAT transforme évaluations, signaux de capacité et preuves produit en insights réflexifs sur l’état actuel, puis s’étend de manière responsable à mesure que le modèle et les preuves gagnent en profondeur.",
      sections: [
        {
          title: "Ce que fait PAT",
          body: "PAT capture des signaux structurés opérationnels et produit, préserve le contexte et transforme ces signaux en interprétation prête à l’action pour les vues cabinet, vendeur et individuelle.",
        },
        {
          title: "Pourquoi cela compte",
          body: "Le modèle est utile parce qu’il relie les couches d’évaluation, de capacité et d’insight au lieu de les disperser entre des routes déconnectées et des résumés génériques.",
        },
        {
          title: "Comment PAT progresse",
          body: "PAT commence par une interprétation de l’état actuel, puis ne s’étend vers des couches plus fortes de recommandation, comparaison et projection que lorsque les preuves sous-jacentes sont suffisamment honnêtes.",
        },
      ],
      valueTitle: "Valeur immédiate",
      valueBody:
        "L’évaluation est le point de départ de PAT, mais pas tout ce qu’est PAT. Le véritable actif est la couche d’intelligence qui transforme dès maintenant les signaux opérationnels et produit en insight réflexif, puis s’étend vers des couches plus fortes de recommandation et de comparaison à mesure que le modèle et les données se renforcent.",
    },
    portal: {
      firm: {
        eyebrow: "Portail cabinet",
        title: "Votre espace cabinet dans PAT",
        body:
          "Débloquez une expérience cabinet plus connectée avec un accès fluide aux évaluations, aux outils opérationnels et aux insights nécessaires pour faire avancer le travail avec confiance.",
        account: "Compte cabinet",
        modulesCompleted: "Modules terminés",
        productReviewLoop: "Boucle de revue produit",
      },
      vendor: {
        eyebrow: "Portail vendeur",
        title: "Votre espace vendeur dans PAT",
        body:
          "Débloquez une expérience vendeur plus connectée avec un accès fluide aux évaluations, aux outils opérationnels et aux insights nécessaires pour faire avancer le travail avec confiance.",
        compatibilityMode:
          "Les tables de taxonomie/profil vendeur ne sont pas encore entièrement disponibles dans la base locale. L’architecture des routes est déjà en place, mais la persistance des données vendeur dépend du schéma Prisma actuellement appliqué.",
        currentVendorContext: "Contexte vendeur actuel",
        account: "Compte",
        vendorCompany: "Société vendeuse",
        products: "Produits",
      },
      individual: {
        eyebrow: "Portail individuel",
        title: "Votre espace individuel pour PAT",
        body:
          "Débloquez une expérience individuelle plus connectée avec un accès fluide aux évaluations, aux outils opérationnels et aux insights nécessaires pour faire avancer le travail avec confiance.",
        individualProfile: "Profil individuel",
        profileTitle: "Structure de profil propre pour la prochaine phase de PAT",
        profileBody:
          "Cette page reste volontairement épurée, mais elle prend désormais en charge les paramètres de contact et de profil PAT au niveau personne sans inventer un second système de compte.",
        profileSettings: "Paramètres du profil",
        currentSignedInAccount: "Compte actuellement connecté",
        account: "Compte",
        role: "Rôle",
        audience: "Audience",
        patSubjectLink: "Lien PAT",
        individualAlignment: "Alignement individuel",
        completed: "Terminé",
        pending: "En attente",
        connected: "Connecté",
        fallback: "Mode de secours",
        unavailable: "Indisponible",
        audienceMismatch:
          "Votre contexte PAT actuellement connecté n’est pas rattaché à l’audience individuelle. Ces routes restent consultables, mais le comportement natif à la personne restera limité tant que le flux individuel dédié ne sera pas construit.",
        companyContext: "Contexte société",
        assessmentCount: "Nombre d’évaluations",
        latestScore: "Dernier score",
        signInToEdit: "Connectez-vous pour modifier les paramètres actuels du profil individuel.",
      },
      cards: {
        firm: {
          "firm-alignment-assessment": {
            title: "Évaluation d’alignement",
            description: "Ouvrez le système d’alignement cabinet en 5 modules et 100 questions et suivez la progression par module.",
          },
          "firm-product-assessments": {
            title: "Évaluation produit",
            description: "Évaluez les produits vendeurs via des évaluations produit orientées utilité qui alimentent l’insight produit vendeur.",
          },
          "firm-insights": {
            title: "Insights d’alignement",
            description: "Ouvrez les insights PAT d’alignement côté cabinet, Pro et Elite, basés sur le signal actuel d’alignement cabinet et produit.",
          },
        },
        vendor: {
          "product-assessment": {
            title: "Évaluation produit",
            description: "Sélectionnez un produit logiciel, déclarez les utilités qu’il couvre et lancez l’évaluation PAT par produit.",
          },
          "product-insight": {
            title: "Insight produit",
            description: "Ouvrez le catalogue d’intelligence produit et consultez les pages d’insight produit autonomes.",
          },
          "alignment-insights": {
            title: "Insight d’alignement",
            description: "Consultez les groupes d’insights d’alignement vendeur Pro et Elite liés au signal d’alignement cabinet.",
          },
        },
        individual: {
          "individual-alignment-assessment": {
            title: "Évaluation d’alignement",
            description: "Ouvrez l’évaluation PAT d’alignement au niveau personne et reportez le signal enregistré vers la visibilité des insights individuels.",
          },
          "individual-product-assessment": {
            title: "Évaluation produit",
            description: "Ouvrez la structure de route de revue produit individuelle liée au futur signal produit natif à la personne.",
          },
          "individual-insights": {
            title: "Insights",
            description: "Consultez la structure des routes d’insight individuelles et le cadrage PAT Pro / Elite.",
          },
        },
      },
    },
    insights: {
      shared: {
        visible: "Visible",
        pending: "En attente",
        locked: "Verrouillé",
        sample: "Échantillon",
        confidence: "Confiance",
        freshness: "Actualisation",
        whatItIs: "Ce que c’est",
        whyItMatters: "Pourquoi cela compte",
        howToUseIt: "Comment l’utiliser",
        assessmentBasis: "Base d’évaluation",
        exactAssessmentBasis: "Base exacte de l’évaluation",
        confidenceAndSampleCaveat: "Confiance et réserve d’échantillon",
        strongestContributingModules: "Modules les plus contributifs",
        weakestContributingModules: "Modules les moins contributifs",
        contributingCapabilities: "Capacités contributives",
        notableQuestionClusters: "Groupes de questions notables",
        moduleEvidence: "Preuve par module",
        capabilityAndQuestionEvidence: "Preuve capacité et questions",
        noCompletedModuleEvidenceYet: "Pas encore de preuve de module terminé.",
        questionClusterEvidenceNotAvailable: "La preuve par groupes de questions n’est pas encore disponible.",
        basisEnglishOnlyNote:
          "Les résumés de preuve de l’état actuel peuvent encore s’afficher en anglais pendant la finalisation d’une localisation plus large des insights.",
      },
      firm: {
        title: "Insights d’alignement cabinet | Patalign",
        heroTitle: "Insights d’alignement cabinet fondés sur les données d’alignement cabinet et produit",
        heroBody:
          "Les insights Pro se débloquent lorsque le cabinet dispose à la fois d’une couverture complète des cinq modules et de la force de capacité requise par chaque thème. Elite reste visible sous forme de cartes restreintes pour montrer où la couche d’intelligence PAT s’étendra ensuite.",
        currentStateNote:
          "L’insight cabinet reste une interprétation PAT de l’état actuel uniquement. Lorsque la couverture des modules ou des capacités est faible, la lecture reste directionnelle et non une preuve forte.",
        modulesCompleted: "Modules terminés",
        productReviewsSubmitted: "Revues produit soumises",
        latestModuleAverage: "Dernière moyenne par module",
        proTitle: "Insights Pro",
        proBody:
          "Insight PAT de l’état actuel visible après l’achèvement des cinq modules et l’atteinte des seuils de capacité concernés.",
        eliteTitle: "Insights Elite",
        eliteBody: "Coming soon. Unlock with Elite membership.",
        proAvailableLabel:
          "Disponible maintenant grâce à la couverture complète de l’alignement cabinet et au signal de capacité requis.",
        proPendingLabel:
          "Nécessite les cinq modules d’alignement cabinet ainsi que les seuils de capacité liés à ce thème.",
        unlockRequirement: "Condition de déblocage",
        unlockBody:
          "Terminez les cinq modules d’alignement cabinet et atteignez les seuils de capacité liés à ce thème. Les badges d’achèvement prouvent la couverture ; les scores de capacité déterminent si l’interprétation Pro est suffisamment solide pour être affichée.",
        backToInsights: "Retour aux insights d’alignement cabinet",
        openAlignmentAssessment: "Ouvrir l’évaluation d’alignement",
      },
      vendorAlignment: {
        title: "Insights d’alignement vendeur | Patalign",
        heroTitle: "Signal PAT côté vendeur fondé sur des preuves actuelles d’évaluation cabinet",
        heroBody:
          "Le catalogue Pro visible s’appuie sur les modules PAT cabinet terminés, la dispersion inter-modules, les groupes de réponses stockés et les scores de capacité lorsqu’ils existent. Elite reste réservé là où le dépôt ne dispose pas encore d’un support honnête de benchmark, projection ou simulation.",
        firmsInSignalBase: "Cabinets dans la base de signal",
        currentPatModuleAverage: "Moyenne actuelle des modules PAT",
        moduleVariance: "Variance inter-modules",
        confidence: "Confiance",
        proTitle: "Abonnement Pro",
        proBody:
          "Intelligence vendeur de l’état actuel, liée au signal PAT cabinet actuel.",
        eliteTitle: "Abonnement Elite",
        eliteBody: "Coming soon. Unlock with Elite membership.",
        assessmentBasis: "Base d’évaluation",
        backToAlignmentInsights: "Retour aux insights d’alignement",
      },
      vendorProduct: {
        title: "Insight produit vendeur | Patalign",
        heroTitle: "Catalogue d’intelligence produit",
        heroBody:
          "Chaque page produit distingue le signal auto-déclaré vendeur du signal revu par les cabinets, puis n’affiche la lecture PAT combinée que lorsque les preuves la soutiennent réellement.",
        heroNote:
          "L’insight produit reste une preuve PAT de l’état actuel uniquement. Une faible couverture des revues cabinet est affichée comme un signal directionnel et non comme une forte confirmation marché.",
        backToVendorHome: "Retour à l’accueil vendeur",
        openProductAssessment: "Ouvrir l’évaluation produit",
        noProducts:
          "Aucun produit vendeur n’est encore disponible. Ajoutez des produits depuis la route d’évaluation produit pour commencer à construire l’intelligence produit.",
        vendorSelfReportedSignal: "Signal auto-déclaré vendeur",
        firmReviewedSignal: "Signal revu par les cabinets",
        combinedPatReadout: "Lecture PAT actuelle combinée",
        productBasis: "Base du produit",
        proTitle: "Insights de l’abonnement Pro",
        proBody:
          "Chaque insight garde distincts l’auto-signal vendeur, la revue cabinet et l’interprétation PAT combinée.",
        eliteTitle: "Insights de l’abonnement Elite",
        eliteBody:
          "L’abonnement Elite reste visible mais retenu tant qu’une couche de preuve plus large n’existe pas. Ces cartes verrouillées n’impliquent pas que l’intelligence de benchmark ou de projection soit déjà active.",
        backToProductCatalog: "Retour au catalogue produit",
        basisTemplateLabel: "Modèle de base",
      },
    },
  },
};

export function resolveLocale(value: string | undefined | null): AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale) ? (value as AppLocale) : "en";
}

export function getLocaleMessages(locale: AppLocale) {
  return messages[locale];
}
