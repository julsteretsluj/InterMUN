/**
 * Apply curated AI-quality translations for high-visibility marketing/chrome
 * strings that machine translate routinely mistranslates (chairs→furniture,
 * tabs→UI chrome, etc.).
 *
 * Usage: node scripts/apply-ai-marketing-polish.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const messagesDir = path.join(root, "messages");

/** @type {Record<string, Record<string, string>>} */
const BY_LOCALE = {
  es: {
    "marketing.hero.subtitle":
      "Software de conferencias que no se interpone hasta que el martillo lo necesita.",
    "marketing.hero.ctaStart": "Organizar un evento",
    "marketing.hero.ctaJoin": "Unirse a tu conferencia",
    "marketing.hero.sticky1": "Lista de asistencia, temporizadores y mociones en un solo piso.",
    "marketing.hero.sticky2": "Hecho para mesas que odian malabarismos con pestañas del navegador.",
    "marketing.hero.floorEyebrow": "En el piso",
    "marketing.about.dreamEyebrow": "El sueño",
    "marketing.about.footerLabel": "Acerca de {app}",
    "marketing.faq.title": "Preguntas frecuentes",
    "marketing.faq.subtitle":
      "Lo que mesas y secretaría suelen preguntar antes de un fin de semana de conferencia.",
    "marketing.faq.q1": "¿Para quién es?",
    "marketing.faq.a1":
      "Delegados, mesas, asesores y secretaría: un espacio de conferencia con herramientas según el rol.",
    "marketing.faq.q2": "¿Podemos gestionar press corps y AG de forma distinta?",
    "marketing.faq.a2":
      "Sí. Los perfiles de procedimiento mantienen el RdP de press corps en esa cámara sin cambiar otros comités.",
    "marketing.faq.q3": "¿Cómo se entra a una sala?",
    "marketing.faq.a3":
      "Código de evento, luego código de sala/comité y, opcionalmente, códigos de placard — pensado para filas reales de check-in.",
    "marketing.faq.q4": "¿Está listo para un fin de semana en vivo?",
    "marketing.faq.a4":
      "Piso de sesión, votación, notas, documentos y supervisión están hechos para uso concurrente entre cámaras.",
    "marketing.footer.tagline":
      "Software de conferencias que no se interpone hasta que el martillo lo necesita.",
    "marketing.footer.product": "Producto",
    "marketing.footer.resources": "Recursos",
    "marketing.footer.howItWorks": "Cómo funciona",
    "marketing.footer.privacy": "Privacidad",
    "marketing.footer.terms": "Términos",
    "marketing.nav.about": "Acerca de",
    "marketing.nav.menu": "Menú",
    "marketing.nav.closeMenu": "Cerrar",
    "marketing.nav.moreOnTheFloor": "Más en el piso",
    "marketing.nav.features": "Funciones",
    "marketing.origin.eyebrow": "Nuestras raíces",
    "marketing.origin.title": "Dónde empezó",
    "marketing.contact.registerSecretariat":
      "¿Listos para empezar? Completa el registro de secretaría.",
    "marketing.contact.registerSecretariatLink": "Registra tu conferencia",
    "marketing.preview.prepWorkspaceTitle": "Añade y guarda trabajo de prep",
    "marketing.preview.prepWorkspaceHint":
      "Los mismos flujos de redactar y guardar que en el panel del delegado: documentos, sugerencias de cláusulas y notas.",
    "marketing.termsPage.eyebrow": "Legal",
    "marketing.privacyPage.eyebrow": "Legal",
    "chromePreferences.openAria": "Abrir ajustes de apariencia y accesibilidad",
    "chromePreferences.appearanceAndAccess": "Accesibilidad y color",
    "chromePreferences.accountAria": "Cuenta y preferencias",
    "chromePreferences.profile": "Perfil",
  },
  fr: {
    "marketing.hero.subtitle":
      "Un logiciel de conférence discret jusqu’au moment où le marteau en a besoin.",
    "marketing.hero.ctaStart": "Organiser un événement",
    "marketing.hero.ctaJoin": "Rejoindre votre conférence",
    "marketing.hero.sticky1": "Appel, chronomètres et motions sur un seul plancher.",
    "marketing.hero.sticky2":
      "Conçu pour les présidences qui détestent jongler avec les onglets.",
    "marketing.hero.floorEyebrow": "Sur le plancher",
    "marketing.about.dreamEyebrow": "Le rêve",
    "marketing.about.footerLabel": "À propos de {app}",
    "marketing.faq.title": "Questions fréquentes",
    "marketing.faq.subtitle":
      "Ce que les présidences et le secrétariat demandent souvent avant un week-end de conférence.",
    "marketing.faq.q1": "Pour qui est-ce ?",
    "marketing.faq.a1":
      "Délégués, présidences, conseillers et secrétariat — un espace de conférence avec des outils selon le rôle.",
    "marketing.faq.q2": "Peut-on gérer press corps et AG différemment ?",
    "marketing.faq.a2":
      "Oui. Les profils de procédure gardent le RdP du press corps dans cette chambre sans changer les autres comités.",
    "marketing.faq.q3": "Comment entrer dans une salle ?",
    "marketing.faq.a3":
      "Code d’événement, puis code de salle/comité, puis codes de placard optionnels — pensé pour les files d’arrivée réelles.",
    "marketing.faq.q4": "Est-ce prêt pour un week-end en direct ?",
    "marketing.faq.a4":
      "Plancher de session, votes, notes, documents et supervision sont conçus pour un usage concurrent entre chambres.",
    "marketing.footer.tagline":
      "Un logiciel de conférence discret jusqu’au moment où le marteau en a besoin.",
    "marketing.footer.product": "Produit",
    "marketing.footer.resources": "Ressources",
    "marketing.footer.howItWorks": "Comment ça marche",
    "marketing.footer.privacy": "Confidentialité",
    "marketing.footer.terms": "Conditions",
    "marketing.nav.about": "À propos",
    "marketing.nav.menu": "Menu",
    "marketing.nav.closeMenu": "Fermer",
    "marketing.nav.moreOnTheFloor": "Plus sur le plancher",
    "marketing.nav.features": "Fonctionnalités",
    "marketing.origin.eyebrow": "Nos racines",
    "marketing.origin.title": "Là où tout a commencé",
    "marketing.contact.registerSecretariat":
      "Prêts à démarrer ? Lancez l’inscription complète du secrétariat.",
    "marketing.contact.registerSecretariatLink": "Inscrivez votre conférence",
    "marketing.preview.prepWorkspaceTitle": "Ajouter et enregistrer la préparation",
    "marketing.preview.prepWorkspaceHint":
      "Les mêmes flux rédiger-et-enregistrer que le tableau de bord délégué — documents, suggestions de clauses et notes.",
    "marketing.termsPage.eyebrow": "Mentions légales",
    "marketing.privacyPage.eyebrow": "Mentions légales",
    "chromePreferences.openAria": "Ouvrir les réglages d’apparence et d’accessibilité",
    "chromePreferences.appearanceAndAccess": "Accessibilité et couleur",
    "chromePreferences.accountAria": "Compte et préférences",
    "chromePreferences.profile": "Profil",
  },
  de: {
    "marketing.hero.subtitle":
      "Konferenzsoftware, die nicht im Weg steht — bis der Hammer fällt.",
    "marketing.hero.ctaStart": "eine Veranstaltung ausrichten",
    "marketing.hero.ctaJoin": "Der Konferenz beitreten",
    "marketing.hero.sticky1": "Anwesenheit, Timer und Anträge auf einer Seite.",
    "marketing.hero.sticky2":
      "Für Vorsitze, die es hassen, mit Browser-Tabs zu jonglieren.",
    "marketing.hero.floorEyebrow": "Auf der Seite",
    "marketing.about.dreamEyebrow": "Der Traum",
    "marketing.about.footerLabel": "Über {app}",
    "marketing.faq.title": "Häufig gefragt",
    "marketing.faq.subtitle":
      "Was Vorsitze und Sekretariat vor einem Konferenzwochenende meist fragen.",
    "marketing.faq.q1": "Für wen ist das?",
    "marketing.faq.a1":
      "Delegierte, Vorsitze, Berater und Sekretariat — ein Konferenzraum mit rollenbasierten Tools.",
    "marketing.origin.eyebrow": "Unsere Wurzeln",
    "marketing.origin.title": "Wo alles begann",
    "marketing.contact.registerSecretariat":
      "Bereit zum Start? Beginnen Sie die vollständige Sekretariatsregistrierung.",
    "marketing.contact.registerSecretariatLink": "Konferenz registrieren",
    "marketing.nav.features": "Funktionen",
    "marketing.preview.prepWorkspaceTitle": "Vorbereitung hinzufügen und speichern",
    "marketing.preview.prepWorkspaceHint":
      "Dieselben Verfassen-und-Speichern-Abläufe wie im Delegierten-Dashboard — Dokumente, Klauselvorschläge und Notizen.",
    "marketing.termsPage.eyebrow": "Rechtliches",
    "marketing.privacyPage.eyebrow": "Rechtliches",
    "marketing.faq.q2": "Können wir Press Corps und GV unterschiedlich führen?",
    "marketing.faq.a2":
      "Ja. Verfahrensprofile halten die Geschäftsordnung des Press Corps in dieser Kammer, ohne andere Komitees zu ändern.",
    "marketing.faq.q3": "Wie kommt man in einen Raum?",
    "marketing.faq.a3":
      "Event-Code, dann Raum-/Komitee-Code, optional Placard-Codes — für echte Check-in-Schlangen gebaut.",
    "marketing.faq.q4": "Ist es bereit für ein Live-Wochenende?",
    "marketing.faq.a4":
      "Sitzungsseite, Abstimmungen, Notizen, Dokumente und Aufsicht sind für parallele Nutzung über Kammern hinweg gebaut.",
    "marketing.footer.tagline":
      "Konferenzsoftware, die nicht im Weg steht — bis der Hammer fällt.",
    "marketing.footer.product": "Produkt",
    "marketing.footer.resources": "Ressourcen",
    "marketing.footer.howItWorks": "So funktioniert’s",
    "marketing.footer.privacy": "Datenschutz",
    "marketing.footer.terms": "Nutzungsbedingungen",
    "marketing.nav.about": "Über uns",
    "marketing.nav.menu": "Menü",
    "marketing.nav.closeMenu": "Schließen",
    "marketing.nav.moreOnTheFloor": "Mehr auf der Seite",
    "chromePreferences.openAria": "Darstellung und Barrierefreiheit öffnen",
    "chromePreferences.appearanceAndAccess": "Barrierefreiheit & Farbe",
    "chromePreferences.accountAria": "Konto und Einstellungen",
    "chromePreferences.profile": "Profil",
  },
};

/** Shared Romance/other locale packs — chairs = dais/presidencia, tabs = browser tabs */
Object.assign(BY_LOCALE, {
  pt: {
    "marketing.hero.subtitle":
      "Software de conferência que fica fora do caminho até o martelo precisar dele.",
    "marketing.hero.ctaStart": "Organizar um evento",
    "marketing.hero.ctaJoin": "Entrar na sua conferência",
    "marketing.hero.sticky1": "Chamada, temporizadores e moções num só piso.",
    "marketing.hero.sticky2":
      "Feito para presidências que odeiam malabarismos com separadores do navegador.",
    "marketing.hero.floorEyebrow": "No piso",
    "marketing.about.dreamEyebrow": "O sonho",
    "marketing.about.footerLabel": "Sobre {app}",
    "marketing.faq.title": "Perguntas frequentes",
    "marketing.faq.subtitle":
      "O que presidências e secretariado costumam perguntar antes de um fim de semana de conferência.",
    "marketing.faq.q1": "Para quem é isto?",
    "marketing.faq.a1":
      "Delegados, presidências, conselheiros e secretariado — um espaço de conferência com ferramentas por função.",
    "marketing.origin.eyebrow": "As nossas raízes",
    "marketing.origin.title": "Onde tudo começou",
    "marketing.contact.registerSecretariat":
      "Prontos para começar? Inicie o registo completo do secretariado.",
    "marketing.contact.registerSecretariatLink": "Registe a sua conferência",
    "marketing.nav.features": "Funcionalidades",
    "marketing.preview.prepWorkspaceTitle": "Adicionar e guardar preparação",
    "marketing.preview.prepWorkspaceHint":
      "Os mesmos fluxos de redigir e guardar do painel do delegado — documentos, sugestões de cláusulas e notas.",
    "marketing.faq.q2": "Podemos gerir press corps e AG de forma diferente?",
    "marketing.faq.a2":
      "Sim. Perfis de procedimento mantêm o RdP do press corps nessa câmara sem alterar outros comités.",
    "marketing.faq.q3": "Como se entra numa sala?",
    "marketing.faq.a3":
      "Código do evento, depois código de sala/comité e, opcionalmente, códigos de placard — pensado para filas reais de check-in.",
    "marketing.faq.q4": "Está pronto para um fim de semana ao vivo?",
    "marketing.faq.a4":
      "Piso de sessão, votações, notas, documentos e supervisão foram feitos para uso em simultâneo entre câmaras.",
    "marketing.footer.tagline":
      "Software de conferência que fica fora do caminho até o martelo precisar dele.",
    "marketing.footer.product": "Produto",
    "marketing.footer.resources": "Recursos",
    "marketing.footer.howItWorks": "Como funciona",
    "marketing.footer.privacy": "Privacidade",
    "marketing.footer.terms": "Termos",
    "marketing.nav.about": "Sobre",
    "marketing.nav.menu": "Menu",
    "marketing.nav.closeMenu": "Fechar",
    "marketing.nav.moreOnTheFloor": "Mais no piso",
    "chromePreferences.openAria": "Abrir definições de aparência e acessibilidade",
    "chromePreferences.appearanceAndAccess": "Acessibilidade e cor",
    "chromePreferences.accountAria": "Conta e preferências",
    "chromePreferences.profile": "Perfil",
  },
  "pt-BR": {
    "marketing.hero.subtitle":
      "Software de conferência que fica fora do caminho até o martelo precisar dele.",
    "marketing.hero.ctaStart": "Organizar um evento",
    "marketing.hero.ctaJoin": "Entrar na sua conferência",
    "marketing.hero.sticky1": "Chamada, timers e moções em um só piso.",
    "marketing.hero.sticky2":
      "Feito para presidências que odeiam malabarismos com abas do navegador.",
    "marketing.hero.floorEyebrow": "No piso",
    "marketing.about.dreamEyebrow": "O sonho",
    "marketing.about.footerLabel": "Sobre {app}",
    "marketing.faq.title": "Perguntas frequentes",
    "marketing.faq.subtitle":
      "O que presidências e secretariado costumam perguntar antes de um fim de semana de conferência.",
    "marketing.faq.q1": "Para quem é isso?",
    "marketing.faq.a1":
      "Delegados, presidências, conselheiros e secretariado — um espaço de conferência com ferramentas por função.",
    "marketing.origin.eyebrow": "Nossas raízes",
    "marketing.origin.title": "Onde tudo começou",
    "marketing.contact.registerSecretariat":
      "Prontos para começar? Inicie o registro completo do secretariado.",
    "marketing.contact.registerSecretariatLink": "Cadastre sua conferência",
    "marketing.nav.features": "Recursos",
    "marketing.preview.prepWorkspaceTitle": "Adicionar e salvar preparação",
    "marketing.preview.prepWorkspaceHint":
      "Os mesmos fluxos de redigir e salvar do painel do delegado — documentos, sugestões de cláusulas e notas.",
    "marketing.faq.q2": "Podemos rodar press corps e AG de forma diferente?",
    "marketing.faq.a2":
      "Sim. Perfis de procedimento mantêm o RdP do press corps naquela câmara sem mudar outros comitês.",
    "marketing.faq.q3": "Como as pessoas entram em uma sala?",
    "marketing.faq.a3":
      "Código do evento, depois código de sala/comitê e, opcionalmente, códigos de placard — pensado para filas reais de check-in.",
    "marketing.faq.q4": "Está pronto para um fim de semana ao vivo?",
    "marketing.faq.a4":
      "Piso de sessão, votação, notas, documentos e supervisão foram feitos para uso simultâneo entre câmaras.",
    "marketing.footer.tagline":
      "Software de conferência que fica fora do caminho até o martelo precisar dele.",
    "marketing.footer.product": "Produto",
    "marketing.footer.resources": "Recursos",
    "marketing.footer.howItWorks": "Como funciona",
    "marketing.footer.privacy": "Privacidade",
    "marketing.footer.terms": "Termos",
    "marketing.nav.about": "Sobre",
    "marketing.nav.menu": "Menu",
    "marketing.nav.closeMenu": "Fechar",
    "marketing.nav.moreOnTheFloor": "Mais no piso",
    "chromePreferences.openAria": "Abrir configurações de aparência e acessibilidade",
    "chromePreferences.appearanceAndAccess": "Acessibilidade e cor",
    "chromePreferences.accountAria": "Conta e preferências",
    "chromePreferences.profile": "Perfil",
  },
  it: {
    "marketing.hero.subtitle":
      "Software per conferenze che resta in disparte finché il martello non ne ha bisogno.",
    "marketing.hero.ctaStart": "Organizza un evento",
    "marketing.hero.ctaJoin": "Unisciti alla tua conferenza",
    "marketing.hero.sticky1": "Appello, timer e mozioni su un unico piano.",
    "marketing.hero.sticky2":
      "Pensato per le presidenze che odiano fare giocoleria con le schede del browser.",
    "marketing.hero.floorEyebrow": "Sul piano",
    "marketing.about.dreamEyebrow": "Il sogno",
    "marketing.about.footerLabel": "Informazioni su {app}",
    "marketing.faq.title": "Domande frequenti",
    "marketing.faq.subtitle":
      "Cosa chiedono di solito le presidenze e la segreteria prima di un weekend di conferenza.",
    "marketing.faq.q1": "Per chi è?",
    "marketing.faq.a1":
      "Delegati, presidenze, advisor e segreteria — uno spazio conferenza con strumenti per ruolo.",
    "marketing.faq.q2": "Possiamo gestire press corps e AG in modo diverso?",
    "marketing.faq.a2":
      "Sì. I profili di procedura tengono il RdP del press corps in quella camera senza cambiare altri comitati.",
    "marketing.faq.q3": "Come si entra in una sala?",
    "marketing.faq.a3":
      "Codice evento, poi codice sala/comitato e, opzionale, codici placard — pensato per file di check-in reali.",
    "marketing.faq.q4": "È pronto per un weekend dal vivo?",
    "marketing.faq.a4":
      "Piano di sessione, votazioni, note, documenti e supervisione sono pensati per uso contemporaneo tra le camere.",
    "marketing.footer.tagline":
      "Software per conferenze che resta in disparte finché il martello non ne ha bisogno.",
    "marketing.footer.product": "Prodotto",
    "marketing.footer.resources": "Risorse",
    "marketing.footer.howItWorks": "Come funziona",
    "marketing.footer.privacy": "Privacy",
    "marketing.footer.terms": "Termini",
    "marketing.nav.about": "Informazioni",
    "marketing.nav.menu": "Menu",
    "marketing.nav.closeMenu": "Chiudi",
    "marketing.nav.moreOnTheFloor": "Altro sul piano",
    "chromePreferences.openAria": "Apri impostazioni di aspetto e accessibilità",
    "chromePreferences.appearanceAndAccess": "Accessibilità e colore",
    "chromePreferences.accountAria": "Account e preferenze",
    "chromePreferences.profile": "Profilo",
  },
  nl: {
    "marketing.hero.subtitle":
      "Conferentiesoftware die uit de weg blijft tot de hamer hem nodig heeft.",
    "marketing.hero.ctaStart": "Een evenement organiseren",
    "marketing.hero.ctaJoin": "Deelnemen aan je conferentie",
    "marketing.hero.sticky1": "Presentielijst, timers en moties op één vloer.",
    "marketing.hero.sticky2":
      "Gemaakt voor voorzitters die een hekel hebben aan jongleren met browsertabs.",
    "marketing.hero.floorEyebrow": "Op de vloer",
    "marketing.about.dreamEyebrow": "De droom",
    "marketing.about.footerLabel": "Over {app}",
    "marketing.faq.title": "Veelgestelde vragen",
    "marketing.faq.subtitle":
      "Wat voorzitters en secretariaat meestal vragen vóór een conferentieweekend.",
    "marketing.faq.q1": "Voor wie is dit?",
    "marketing.faq.a1":
      "Afgevaardigden, voorzitters, advisors en secretariaat — één conferentieruimte met rolbewuste tools.",
    "marketing.faq.q2": "Kunnen we press corps en AV anders draaien?",
    "marketing.faq.a2":
      "Ja. Procedureprofielen houden de RoP van press corps bij die kamer zonder andere commissies te wijzigen.",
    "marketing.faq.q3": "Hoe komt men in een zaal?",
    "marketing.faq.a3":
      "Eventcode, dan zaal-/commissiecode, daarna optionele placardcodes — voor echte check-inrijen.",
    "marketing.faq.q4": "Is het klaar voor een live weekend?",
    "marketing.faq.a4":
      "Sessievloer, stemmen, notities, documenten en toezicht zijn gebouwd voor gelijktijdig gebruik over kamers.",
    "marketing.footer.tagline":
      "Conferentiesoftware die uit de weg blijft tot de hamer hem nodig heeft.",
    "marketing.footer.product": "Product",
    "marketing.footer.resources": "Bronnen",
    "marketing.footer.howItWorks": "Hoe het werkt",
    "marketing.footer.privacy": "Privacy",
    "marketing.footer.terms": "Voorwaarden",
    "marketing.nav.about": "Over",
    "marketing.nav.menu": "Menu",
    "marketing.nav.closeMenu": "Sluiten",
    "marketing.nav.moreOnTheFloor": "Meer op de vloer",
    "chromePreferences.openAria": "Weergave- en toegankelijkheidsinstellingen openen",
    "chromePreferences.appearanceAndAccess": "Toegankelijkheid & kleur",
    "chromePreferences.accountAria": "Account en voorkeuren",
    "chromePreferences.profile": "Profiel",
  },
});

// Continue with remaining locales — concise but correct MUN terminology
const MORE = {
  ru: {
    sticky2: "Для председателей, которые ненавидят жонглировать вкладками браузера.",
    sticky1: "Перекличка, таймеры и предложения — на одном полу.",
    subtitle: "ПО для конференций, которое не мешает, пока не понадобится молоток.",
    ctaJoin: "Присоединиться к конференции",
    ctaStart: "Провести мероприятие",
    floorEyebrow: "На полу",
    dream: "Мечта",
    about: "О {app}",
    faqTitle: "Частые вопросы",
    faqSub: "Что обычно спрашивают председатели и секретариат перед конференцией.",
    q1: "Для кого это?",
    a1: "Делегаты, председатели, советники и секретариат — одно рабочее пространство с инструментами по ролям.",
    product: "Продукт",
    resources: "Ресурсы",
    how: "Как это работает",
    privacy: "Конфиденциальность",
    terms: "Условия",
    aboutNav: "О нас",
    menu: "Меню",
    close: "Закрыть",
    moreFloor: "Ещё на полу",
    openAria: "Открыть настройки оформления и доступности",
    a11y: "Доступность и цвет",
    accountAria: "Аккаунт и настройки",
    profile: "Профиль",
  },
  pl: {
    sticky2: "Dla przewodniczących, którzy nienawidzą żonglowania kartami przeglądarki.",
    sticky1: "Lista obecności, timery i wnioski na jednej sali.",
    subtitle: "Oprogramowanie konferencyjne, które nie przeszkadza, dopóki młotek go nie potrzebuje.",
    ctaJoin: "Dołącz do konferencji",
    ctaStart: "Zorganizuj wydarzenie",
    floorEyebrow: "Na sali",
    dream: "Marzenie",
    about: "O {app}",
    faqTitle: "Częste pytania",
    faqSub: "Co zwykle pytają przewodniczący i sekretariat przed weekendem konferencji.",
    q1: "Dla kogo to jest?",
    a1: "Delegaci, przewodniczący, doradcy i sekretariat — jedna przestrzeń z narzędziami według roli.",
    product: "Produkt",
    resources: "Zasoby",
    how: "Jak to działa",
    privacy: "Prywatność",
    terms: "Warunki",
    aboutNav: "O nas",
    menu: "Menu",
    close: "Zamknij",
    moreFloor: "Więcej na sali",
    openAria: "Otwórz ustawienia wyglądu i dostępności",
    a11y: "Dostępność i kolor",
    accountAria: "Konto i preferencje",
    profile: "Profil",
  },
  ja: {
    sticky2: "ブラウザのタブを行ったり来たりするのが嫌いな議長のために。",
    sticky1: "点呼・タイマー・動議をひとつのフロアで。",
    subtitle: "ガベルが必要になるまで邪魔をしない会議ソフトウェア。",
    ctaJoin: "会議に参加",
    ctaStart: "イベントを開催",
    floorEyebrow: "フロアにて",
    dream: "夢",
    about: "{app}について",
    faqTitle: "よくある質問",
    faqSub: "会議週末の前に議長と事務局がよく尋ねること。",
    q1: "誰向けですか？",
    a1: "代表・議長・アドバイザー・事務局 — 役割に応じたツールを持つひとつの会議ワークスペース。",
    product: "製品",
    resources: "リソース",
    how: "使い方",
    privacy: "プライバシー",
    terms: "利用規約",
    aboutNav: "について",
    menu: "メニュー",
    close: "閉じる",
    moreFloor: "フロアでもっと見る",
    openAria: "外観とアクセシビリティの設定を開く",
    a11y: "アクセシビリティとカラー",
    accountAria: "アカウントと設定",
    profile: "プロフィール",
  },
  "zh-CN": {
    sticky2: "为讨厌在浏览器标签间来回切换的主席而设计。",
    sticky1: "点名、计时与动议，尽在同一会场。",
    subtitle: "在需要敲槌之前尽量不打扰你的会议软件。",
    ctaJoin: "加入你的会议",
    ctaStart: "主办活动",
    floorEyebrow: "会场上",
    dream: "愿景",
    about: "关于 {app}",
    faqTitle: "常见问题",
    faqSub: "主席与秘书处在会议周末前常问的问题。",
    q1: "这是给谁用的？",
    a1: "代表、主席、顾问与秘书处 — 一个按角色提供工具的会议工作区。",
    product: "产品",
    resources: "资源",
    how: "如何运作",
    privacy: "隐私",
    terms: "条款",
    aboutNav: "关于",
    menu: "菜单",
    close: "关闭",
    moreFloor: "会场上查看更多",
    openAria: "打开外观与无访问性设置",
    a11y: "无障碍与颜色",
    accountAria: "账户与偏好",
    profile: "个人资料",
  },
  "zh-TW": {
    sticky2: "為討厭在瀏覽器分頁間切換的主席而設計。",
    sticky1: "唱名、計時與動議，盡在同一會場。",
    subtitle: "在需要敲槌之前盡量不打擾你的會議軟體。",
    ctaJoin: "加入你的會議",
    ctaStart: "主辦活動",
    floorEyebrow: "會場上",
    dream: "願景",
    about: "關於 {app}",
    faqTitle: "常見問題",
    faqSub: "主席與秘書處在會議週末前常問的問題。",
    q1: "這是給誰用的？",
    a1: "代表、主席、顧問與秘書處 — 一個依角色提供工具的會議工作區。",
    product: "產品",
    resources: "資源",
    how: "如何運作",
    privacy: "隱私權",
    terms: "條款",
    aboutNav: "關於",
    menu: "選單",
    close: "關閉",
    moreFloor: "會場上查看更多",
    openAria: "開啟外觀與無障礙設定",
    a11y: "無障礙與顏色",
    accountAria: "帳戶與偏好",
    profile: "個人資料",
  },
  ko: {
    sticky2: "브라우저 탭을 오가는 게 싫은 의장들을 위해 만들었습니다.",
    sticky1: "호명, 타이머, 동의안을 한 플로어에서.",
    subtitle: "의사봉이 필요할 때까지 방해하지 않는 회의 소프트웨어.",
    ctaJoin: "회의에 참가",
    ctaStart: "행사 개최",
    floorEyebrow: "플로어에서",
    dream: "꿈",
    about: "{app} 소개",
    faqTitle: "자주 묻는 질문",
    faqSub: "회의 주말 전에 의장과 사무국이 보통 묻는 것.",
    q1: "누구를 위한 것인가요?",
    a1: "대표, 의장, 어드바이저, 사무국 — 역할별 도구가 있는 하나의 회의 작업 공간.",
    product: "제품",
    resources: "리소스",
    how: "작동 방식",
    privacy: "개인정보",
    terms: "약관",
    aboutNav: "소개",
    menu: "메뉴",
    close: "닫기",
    moreFloor: "플로어에서 더 보기",
    openAria: "모양 및 접근성 설정 열기",
    a11y: "접근성 및 색상",
    accountAria: "계정 및 환경설정",
    profile: "프로필",
  },
  ar: {
    sticky2: "مصمّم لرؤساء اللجان الذين يكرهون التنقل بين تبويبات المتصفح.",
    sticky1: "نداء الأسماء والمؤقتات والمقترحات في قاعة واحدة واحدة.",
    subtitle: "برمجيات مؤتمرات تبقى بعيدة عن الطريق حتى يحتاجها المطرقة.",
    ctaJoin: "انضم إلى مؤتمرك",
    ctaStart: "استضف فعالية",
    floorEyebrow: "في القاعة",
    dream: "الحلم",
    about: "حول {app}",
    faqTitle: "أسئلة شائعة",
    faqSub: "ما يسأله الرؤساء والأمانة عادة قبل عطلة مؤتمر.",
    q1: "لمن هذا؟",
    a1: "المندوبون والرؤساء والمستشارون والأمانة — مساحة مؤتمر واحدة بأدوات حسب الدور.",
    product: "المنتج",
    resources: "الموارد",
    how: "كيف يعمل",
    privacy: "الخصوصية",
    terms: "الشروط",
    aboutNav: "حول",
    menu: "القائمة",
    close: "إغلاق",
    moreFloor: "المزيد في القاعة",
    openAria: "فتح إعدادات المظهر وإمكانية الوصول",
    a11y: "إمكانية الوصول واللون",
    accountAria: "الحساب والتفضيلات",
    profile: "الملف الشخصي",
  },
  th: {
    sticky2: "ออกแบบมาสำหรับประธานที่เกลียดการสลับแท็บเบราว์เซอร์ไปมา",
    sticky1: "เรียกชื่อ ตัวจับเวลา และญัตติในห้องประชุมเดียว",
    subtitle: "ซอฟต์แวร์ประชุมที่ไม่วุ่นวายจนกว่าจะถึงเวลาใช้ค้อน",
    ctaJoin: "เข้าร่วมการประชุมของคุณ",
    ctaStart: "จัดอีเวนต์",
    floorEyebrow: "บนพื้นประชุม",
    dream: "ความฝัน",
    about: "เกี่ยวกับ {app}",
    faqTitle: "คำถามที่พบบ่อย",
    faqSub: "สิ่งที่ประธานและเลขาธิการมักถามก่อนสุดสัปดาห์ของการประชุม",
    q1: "นี่เพื่อใคร?",
    a1: "ผู้แทน ประธาน ที่ปรึกษา และเลขาธิการ — พื้นที่ประชุมเดียวพร้อมเครื่องมือตามบทบาท",
    product: "ผลิตภัณฑ์",
    resources: "ทรัพยากร",
    how: "ใช้งานอย่างไร",
    privacy: "ความเป็นส่วนตัว",
    terms: "ข้อกำหนด",
    aboutNav: "เกี่ยวกับ",
    menu: "เมนู",
    close: "ปิด",
    moreFloor: "เพิ่มเติมบนพื้นประชุม",
    openAria: "เปิดการตั้งค่าลักษณะและการเข้าถึง",
    a11y: "การเข้าถึงและสี",
    accountAria: "บัญชีและการตั้งค่า",
    profile: "โปรไฟล์",
  },
};

function expandShort(pack) {
  return {
    "marketing.hero.subtitle": pack.subtitle,
    "marketing.hero.ctaStart": pack.ctaStart,
    "marketing.hero.ctaJoin": pack.ctaJoin,
    "marketing.hero.sticky1": pack.sticky1,
    "marketing.hero.sticky2": pack.sticky2,
    "marketing.hero.floorEyebrow": pack.floorEyebrow,
    "marketing.about.dreamEyebrow": pack.dream,
    "marketing.about.footerLabel": pack.about,
    "marketing.faq.title": pack.faqTitle,
    "marketing.faq.subtitle": pack.faqSub,
    "marketing.faq.q1": pack.q1,
    "marketing.faq.a1": pack.a1,
    "marketing.footer.tagline": pack.subtitle,
    "marketing.footer.product": pack.product,
    "marketing.footer.resources": pack.resources,
    "marketing.footer.howItWorks": pack.how,
    "marketing.footer.privacy": pack.privacy,
    "marketing.footer.terms": pack.terms,
    "marketing.nav.about": pack.aboutNav,
    "marketing.nav.menu": pack.menu,
    "marketing.nav.closeMenu": pack.close,
    "marketing.nav.moreOnTheFloor": pack.moreFloor,
    "chromePreferences.openAria": pack.openAria,
    "chromePreferences.appearanceAndAccess": pack.a11y,
    "chromePreferences.accountAria": pack.accountAria,
    "chromePreferences.profile": pack.profile,
  };
}

for (const [loc, pack] of Object.entries(MORE)) {
  BY_LOCALE[loc] = { ...expandShort(pack), ...(BY_LOCALE[loc] || {}) };
}

// Additional locales with careful sticky2 + chrome at minimum
const STICKY2 = {
  uk: "Для голів, які ненавидять жонглювати вкладками браузера.",
  el: "Φτιαγμένο για προέδρους που μισούν να κάνουν ζογκλερικές με καρτέλες προγράμματος περιήγησης.",
  tr: "Tarayıcı sekmeleriyle hokkabazlık yapmaktan nefret eden başkanlar için.",
  vi: "Dành cho các chủ tịch ghét phải chuyển qua lại giữa các tab trình duyệt.",
  id: "Dibuat untuk ketua yang benci bolak-balik antar tab browser.",
  hi: "उन अध्यक्षों के लिए जो ब्राउज़र टैब बदलते-फिरते थक गए हैं।",
  bn: "ব্রাউজার ট্যাব নিয়ে ঘোরাঘুরি করতে ঘৃণা করা চেয়ারদের জন্য তৈরি।",
  fa: "برای رؤسایی که از جابه‌جایی میان زبانه‌های مرورگر متنفرند.",
  he: "מיועד ליושבי ראש ששונאים לקפץ בין לשוניות בדפדפן.",
  sw: "Imetengenezwa kwa wenyeviti wanaochukia kubadilisha-badilisha tabo za kivinjari.",
  mi: "I hangaia mō ngā heamana e kino ana ki te whakataka tab pūtirotiro.",
  km: "បង្កើតសម្រាប់ប្រធានដែលស្អប់ការប្តូរទៅមករវាង tab កម្មវិធីរុករក។",
  lo: "ສ້າງສຳລັບປະທານທີ່ຊັງການສະຫຼັບແທັບບຣາວເຊີ.",
  my: "ဘရောက်ဇာ တဘ်များ လှည့်ပတ်သုံးရသည်ကို မုန်းသော ဥက္ကဋ္ဌများအတွက်။",
  ms: "Dibina untuk pengerusi yang benci melompat antara tab pelayar.",
};

const PROFILE = {
  uk: { profile: "Профіль", accountAria: "Обліковий запис і налаштування", a11y: "Доступність і колір", openAria: "Відкрити налаштування вигляду й доступності" },
  el: { profile: "Προφίλ", accountAria: "Λογαριασμός και προτιμήσεις", a11y: "Προσβασιμότητα και χρώμα", openAria: "Άνοιγμα ρυθμίσεων εμφάνισης και προσβασιμότητας" },
  tr: { profile: "Profil", accountAria: "Hesap ve tercihler", a11y: "Erişilebilirlik ve renk", openAria: "Görünüm ve erişilebilirlik ayarlarını aç" },
  vi: { profile: "Hồ sơ", accountAria: "Tài khoản và tùy chọn", a11y: "Trợ năng và màu sắc", openAria: "Mở cài đặt giao diện và trợ năng" },
  id: { profile: "Profil", accountAria: "Akun dan preferensi", a11y: "Aksesibilitas & warna", openAria: "Buka pengaturan tampilan dan aksesibilitas" },
  hi: { profile: "प्रोफ़ाइल", accountAria: "खाता और प्राथमिकताएँ", a11y: "पहुँचयोग्यता और रंग", openAria: "रूप और पहुँच सेटिंग खोलें" },
  bn: { profile: "প্রোফাইল", accountAria: "অ্যাকাউন্ট ও পছন্দসমূহ", a11y: "অ্যাক্সেসিবিলিটি ও রঙ", openAria: "চেহারা ও অ্যাক্সেসিবিলিটি সেটিং খুলুন" },
  fa: { profile: "نمایه", accountAria: "حساب و ترجیحات", a11y: "دسترس‌پذیری و رنگ", openAria: "باز کردن تنظیمات ظاهر و دسترس‌پذیری" },
  he: { profile: "פרופיל", accountAria: "חשבון והעדפות", a11y: "נגישות וצבע", openAria: "פתח הגדרות מראה ונגישות" },
  sw: { profile: "Wasifu", accountAria: "Akaunti na mapendeleo", a11y: "Ufikivu na rangi", openAria: "Fungua mipangilio ya muonekano na ufikivu" },
  mi: { profile: "Kōtaha", accountAria: "Pūkete me ngā manakohanga", a11y: "Wātea ā-tae me te tae", openAria: "Tuwhera ngā tautuhinga āhua me te wātea ā-tae" },
  km: { profile: "ប្រវត្តិរូប", accountAria: "គណនី និងចំណូលចិត្ត", a11y: "ភាពងាយស្រួល និងពណ៌", openAria: "បើកការកំណត់រូបរាង និងភាពងាយស្រួល" },
  lo: { profile: "ໂປຣໄຟລ໌", accountAria: "ບັນຊີ ແລະ ການຕັ້ງຄ່າ", a11y: "ການເຂົ້າເຖິງ ແລະ ສີ", openAria: "ເປີດການຕັ້ງຄ່າຮູບແບບ ແລະ ການເຂົ້າເຖິງ" },
  my: { profile: "ပရိုဖိုင်", accountAria: "အကောင့်နှင့် ဦးစားပေးများ", a11y: "အသုံးပြုနိုင်မှုနှင့် အရောင်", openAria: "အသွင်အပြင်နှင့် အသုံးပြုနိုင်မှု ဆက်တင်များ ဖွင့်ရန်" },
  ms: { profile: "Profil", accountAria: "Akaun dan keutamaan", a11y: "Kebolehaksesan & warna", openAria: "Buka tetapan penampilan dan kebolehaksesan" },
};

for (const [loc, sticky2] of Object.entries(STICKY2)) {
  const chrome = PROFILE[loc] || {};
  BY_LOCALE[loc] = {
    ...(BY_LOCALE[loc] || {}),
    "marketing.hero.sticky2": sticky2,
    "chromePreferences.profile": chrome.profile || "Profile",
    "chromePreferences.accountAria": chrome.accountAria || "Account and preferences",
    "chromePreferences.appearanceAndAccess": chrome.a11y || "Accessibility & colour",
    "chromePreferences.openAria": chrome.openAria || "Open appearance and accessibility settings",
  };
}

// Fix Spanish "mesas" → better "presidencias" / keep dais feel - actually in MUN Spanish "mesa" is sometimes used for dais. "presidencias" is clearer.
BY_LOCALE.es["marketing.hero.sticky2"] =
  "Hecho para presidencias que odian malabarismos con pestañas del navegador.";
BY_LOCALE.es["marketing.faq.subtitle"] =
  "Lo que presidencias y secretaría suelen preguntar antes de un fin de semana de conferencia.";
BY_LOCALE.es["marketing.faq.a1"] =
  "Delegados, presidencias, asesores y secretaría: un espacio de conferencia con herramientas según el rol.";

function setDeep(obj, dotPath, value) {
  const keys = dotPath.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] ??= {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

async function main() {
  let files = 0;
  let keys = 0;
  for (const [locale, map] of Object.entries(BY_LOCALE)) {
    const file = path.join(messagesDir, `${locale}.json`);
    const json = JSON.parse(await fs.readFile(file, "utf8"));
    for (const [p, v] of Object.entries(map)) {
      setDeep(json, p, v);
      keys++;
    }
    await fs.writeFile(file, `${JSON.stringify(json, null, 2)}\n`);
    files++;
    console.log(`${locale}: applied ${Object.keys(map).length} strings`);
  }
  console.log(`Done. ${files} locales, ${keys} key writes.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
