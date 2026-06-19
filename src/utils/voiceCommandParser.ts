/**
 * Voice command parsing utilities
 * Handles intent detection and parameter extraction from voice commands
 */

export interface ParsedCommand {
  intent: string;
  product: string | null;
  quantity: number;
  language: string;
}

const quantityMap: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10
};

// Multi-language quantity mappings
const quantityMaps: Record<string, Record<string, number>> = {
  en: { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 },
  de: { eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10 },
  fr: { un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 },
  es: { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 },
};

// Multi-language intent patterns
const intentPatterns: Record<string, Record<string, RegExp>> = {
  en: {
    add_to_cart: /(add|put|place|insert|buy|purchase|get|order|want|need).*(?:cart|basket|bag)/i,
    remove_from_cart: /(remove|delete|take out|clear|drop).*(?:cart|basket|bag)/i,
    view_cart: /(show|display|view|open|check|what's in).*(?:cart|basket|bag)/i,
    checkout: /(checkout|pay|purchase|buy now|complete order|proceed)/i,
    search_products: /(search|find|look for|show me|browse|what do you have).*(?:product|item)/i,
    navigate_home: /(home|main page|start|beginning)/i,
    navigate_products: /(products|shop|store|catalog|browse)/i,
    clear_cart: /(clear|empty|remove all|delete all).*(?:cart|basket)/i,
    create_order: /(create|place|make|submit).*(?:order|purchase)/i,
    check_order_status: /(check|status|track|where is).*(?:order|my order|delivery)/i,
    help: /(help|what can you do|commands|options)/i,
    repeat: /(repeat|say again|what|pardon)/i,
    cancel: /(cancel|stop|never mind|forget it)/i,
  },
  de: {
    add_to_cart: /(hinzufügen|legen|stellen|einlegen|kaufen|bestellen|bekommen|wollen|brauchen).*(?:warenkorb|korb|tasche)/i,
    remove_from_cart: /(entfernen|löschen|herausnehmen|leeren).*(?:warenkorb|korb|tasche)/i,
    view_cart: /(zeigen|anzeigen|ansehen|öffnen|prüfen|was ist in).*(?:warenkorb|korb|tasche)/i,
    checkout: /(kasse|bezahlen|kaufe jetzt|bestellung abschließen|weiter)/i,
    search_products: /(suchen|finden|suche nach|zeige mir|durchsuchen).*(?:produkt|artikel)/i,
    navigate_home: /(startseite|hauptseite|anfang|beginn)/i,
    navigate_products: /(produkte|shop|geschäft|katalog|durchstöbern)/i,
    clear_cart: /(leeren|entleeren|alles entfernen|alles löschen).*(?:warenkorb|korb)/i,
    help: /(hilfe|was kannst du tun|befehle|optionen)/i,
    cancel: /(abbrechen|stop|egal|vergiss es)/i,
  },
  fr: {
    add_to_cart: /(ajouter|mettre|placer|insérer|acheter|acheter|obtenir|vouloir|besoin).*(?:panier|sac)/i,
    remove_from_cart: /(supprimer|effacer|retirer|vider).*(?:panier|sac)/i,
    view_cart: /(montrer|afficher|voir|ouvrir|vérifier|qu'est-ce qu'il y a).*(?:panier|sac)/i,
    checkout: /(caisse|payer|achat|acheter maintenant|commander|continuer)/i,
    search_products: /(chercher|trouver|recherche de|montre-moi|parcourir).*(?:produit|article)/i,
    navigate_home: /(accueil|page principale|début|commencement)/i,
    navigate_products: /(produits|boutique|magasin|catalogue|parcourir)/i,
    clear_cart: /(vider|nettoyer|supprimer tout|effacer tout).*(?:panier|sac)/i,
    help: /(aide|que peux-tu faire|commandes|options)/i,
    cancel: /(annuler|arrêter|peu importe|oublie)/i,
  },
  es: {
    add_to_cart: /(añadir|poner|colocar|insertar|comprar|adquirir|obtener|querer|necesitar).*(?:carrito|cesta|bolsa)/i,
    remove_from_cart: /(eliminar|borrar|sacar|vaciar).*(?:carrito|cesta|bolsa)/i,
    view_cart: /(mostrar|exhibir|ver|abrir|verificar|qué hay en).*(?:carrito|cesta|bolsa)/i,
    checkout: /(caja|pagar|compra|comprar ahora|completar pedido|continuar)/i,
    search_products: /(buscar|encontrar|búsqueda de|muéstrame|navegar).*(?:producto|artículo)/i,
    navigate_home: /(inicio|página principal|comienzo|principio)/i,
    navigate_products: /(productos|tienda|almacén|catálogo|navegar)/i,
    clear_cart: /(vaciar|limpiar|eliminar todo|borrar todo).*(?:carrito|cesta)/i,
    help: /(ayuda|qué puedes hacer|comandos|opciones)/i,
    cancel: /(cancelar|detener|no importa|olvídalo)/i,
  },
};

export const parseCommand = (command: string, language: string = 'en'): ParsedCommand => {
  const lowerCmd = command.toLowerCase().trim();
  
  // Get language-specific patterns
  const langPatterns = intentPatterns[language] || intentPatterns.en;
  const langQuantityMap = quantityMaps[language] || quantityMaps.en;
  
  // Quantity extraction with language support
  const quantityMatch = lowerCmd.match(/(\d+|[a-z]+)/);
  const quantity = quantityMatch 
    ? (langQuantityMap[quantityMatch[1]] || parseInt(quantityMatch[1]) || 1)
    : 1;

  // Product extraction (language-agnostic patterns)
  const productPatterns = [
    /(?:add|buy|purchase|get|order|hinzufügen|kaufen|bestellen|ajouter|acheter|añadir|comprar)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+)?(?:\d+\s+)?(.+?)(?:\s+to|\s+in|\s+please|$)/i,
    /(?:looking\s+for|want|need|show\s+me|suche nach|zeige mir|cherche|montre|muéstrame|busca)\s+(?:a\s+|an\s+|some\s+)?(.+?)(?:\s+please|$)/i,
    /(?:remove|delete|take\s+out|entfernen|löschen|supprimer|retirer|eliminar)\s+(?:the\s+)?(.+?)(?:\s+from|$)/i,
  ];
  
  let product = null;
  for (const pattern of productPatterns) {
    const match = lowerCmd.match(pattern);
    if (match && match[1]) {
      product = match[1].trim()
        .replace(/\b(please|thanks|thank you|to cart|from cart|bitte|danke|merci|gracias)\b/gi, '')
        .trim();
      break;
    }
  }

  // Intent detection with language support
  let detectedIntent = "unknown";
  for (const [intent, pattern] of Object.entries(langPatterns)) {
    if (pattern.test(lowerCmd)) {
      detectedIntent = intent;
      break;
    }
  }

  return { intent: detectedIntent, product, quantity, language };
};
