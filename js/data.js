/* ==========================================================================
   else — sample data
   Temporary data with the same shape the public backend endpoints will
   return. When the backend is ready, js/else.js reads from the API instead
   and this file can be deleted.

   Future endpoints (read-only, no login, no personal data):
     GET /public/brands   -> brands
     GET /public/items    -> items
     GET /public/posts    -> posts marked "Show on web" in the admin
   ========================================================================== */

// The official else account, seller of the sample items
var ELSE_OFFICIAL_SELLER = { displayName: "Else C.", verified: true, official: true, pieceCount: 15, followerCount: 21 };

// Sample dates are relative to "now" so the sample always looks fresh
function sampleHoursAgo(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

window.ELSE_SAMPLE_DATA = {
  // GET /public/items — latest published pieces, newest first.
  // GET /public/items/{id} — one piece, same fields.
  // Prices in the currency's main unit; retailPrice is the "Retail approx."
  // found by else AI (null when there isn't one). The seller appears with
  // their alias unless they are a verified account.
  items: [
    {
      id: "sample-ganni-tee", brand: "Ganni", title: "Leopard Cub Graphic Tee", size: "M", condition: "Good", category: "Tops", color: "Gray",
      price: 45, retailPrice: 95, currency: "USD", sold: false, listedAt: sampleHoursAgo(20),
      photoUrl: "img/sample/ganni-tee.jpg", photos: ["img/sample/ganni-tee.jpg"],
      description: "Grey melange organic cotton tee with the Ganni logo and leopard cub print. Relaxed fit, looks great with the sleeves rolled. Light signs of wear on the print.",
      stylingNote: "Pair this grey Ganni tee with high-waisted denim and white sneakers for an easy weekend look, and it's perfect for casual brunches with the sleeves rolled up.",
      seller: ELSE_OFFICIAL_SELLER
    },
    {
      id: "sample-staud-dress", brand: "Staud", title: "Draped Two-Tone Jersey Dress", size: "S", condition: "Like new", category: "Dresses", color: "Brown",
      price: 225, retailPrice: 495, currency: "USD", sold: false, listedAt: sampleHoursAgo(52),
      photoUrl: "img/sample/staud-dress.jpg", photos: ["img/sample/staud-dress.jpg"],
      description: "Fitted mock-neck jersey top that drops into a soft draped skirt in olive. Worn once.",
      stylingNote: "Let the dress do the talking: strappy sandals, a sculptural bag and gold hoops for dinner.",
      seller: ELSE_OFFICIAL_SELLER
    },
    {
      id: "sample-ganni-hoodie", brand: "Ganni", title: "Graphic Tiger Wool Hoodie", size: "M", condition: "Like new", category: "Knitwear", color: "Navy",
      price: 160, retailPrice: 345, currency: "USD", sold: false, listedAt: sampleHoursAgo(70),
      photoUrl: "img/sample/ganni-hoodie.jpg", photos: ["img/sample/ganni-hoodie.jpg"],
      description: "Oversized navy wool hoodie with the tiger intarsia. Super soft, no pilling.",
      stylingNote: "Throw it over a sequin skirt for the high-low look, or keep it easy with straight jeans and loafers.",
      seller: ELSE_OFFICIAL_SELLER
    },
    {
      id: "sample-sandro-bag", brand: "Sandro", title: "Suede Bucket Bag", size: "One size", condition: "Like new", category: "Bags", color: "Brown",
      price: 210, retailPrice: 495, currency: "USD", sold: false, listedAt: sampleHoursAgo(80),
      photoUrl: "img/sample/sandro-bag.jpg", photos: ["img/sample/sandro-bag.jpg"],
      description: "Olive suede bucket bag with leather trim and adjustable strap. Like new, kept in its dust bag.",
      stylingNote: "Warm suede goes with everything from denim to knits. Perfect for rainy-day looks.",
      seller: ELSE_OFFICIAL_SELLER
    },
    {
      id: "sample-blue-dress", brand: "Staud", title: "Satin Slip Dress", size: "S", condition: "Like new", category: "Dresses", color: "Blue",
      price: 195, retailPrice: null, currency: "USD", sold: false, listedAt: sampleHoursAgo(30),
      photoUrl: "img/sample/blue-dress.jpg", photos: ["img/sample/blue-dress.jpg"],
      description: "Periwinkle satin slip with a cowl neck and a pink tulle hem peeking out. Worn to one wedding.",
      stylingNote: "Wedding guest ready: delicate heels, a beaded clutch and your hair up.",
      seller: ELSE_OFFICIAL_SELLER
    },
    {
      id: "sample-heels", brand: "Staud", title: "Open-Toe Heeled Sandal", size: "38", condition: "Good", category: "Shoes", color: "Black",
      price: 110, retailPrice: null, currency: "USD", sold: false, listedAt: sampleHoursAgo(96),
      photoUrl: "img/sample/heels.jpg", photos: ["img/sample/heels.jpg"],
      description: "Black textured d'Orsay sandal with a slim heel. Small marks on the soles.",
      stylingNote: "The easiest way to dress up jeans. Also lovely with a slip dress.",
      seller: ELSE_OFFICIAL_SELLER
    },
    {
      id: "sample-tote", brand: "else", title: "else Canvas Tote — Sky Blue", size: "One size", condition: "New", category: "Bags", color: "Cream",
      price: 5, retailPrice: null, currency: "USD", sold: false, listedAt: sampleHoursAgo(11),
      photoUrl: "img/sample/tote.jpg", photos: ["img/sample/tote.jpg"],
      description: "Our heavy cotton canvas tote with the else logo in sky blue. Fits a laptop and then some.",
      stylingNote: null,
      seller: ELSE_OFFICIAL_SELLER
    },
    {
      id: "sample-staud-beaded", brand: "Staud", title: "Beaded Frame Bag", size: "One size", condition: "Like new", category: "Bags", color: "Silver",
      price: 165, retailPrice: null, currency: "USD", sold: true, listedAt: sampleHoursAgo(120),
      photoUrl: "img/sample/staud-beaded.jpg", photos: ["img/sample/staud-beaded.jpg"],
      description: "Beaded frame bag with fringe and a chain strap.",
      stylingNote: null,
      seller: ELSE_OFFICIAL_SELLER
    }
  ],

  // GET /public/posts — only posts marked "Show on web" in the admin.
  // Members appear with an alias generated by the backend (never their
  // real name or photo). Verified accounts (else and the founders) appear
  // with their real name. At most 3 replies per post, verified ones first.
  posts: [
    {
      id: "sample-post-1",
      author: { displayName: "Else C.", verified: true, official: true },
      createdAt: sampleHoursAgo(11),
      text: "Hey hey!! 🩵 Welcome to Community, our brand new space to talk all things style. Share your finds, your outfits, your hot takes — post away!\n\nTo celebrate, meet the else tote. Would you get one? Tell us in the replies.",
      item: { id: "sample-tote", brand: "else", title: "else Canvas Tote — Sky Blue", price: 5, currency: "USD", photoUrl: "img/sample/tote.jpg", sold: false },
      likeCount: 5,
      replyCount: 3,
      replies: [
        { id: "r1", author: { displayName: "claudia d.", verified: true }, createdAt: sampleHoursAgo(11), text: "i love this how can i get one" },
        { id: "r2", author: { displayName: "@softpink", verified: false }, createdAt: sampleHoursAgo(11), text: "do you also have it in pink" },
        { id: "r3", author: { displayName: "gabriela c.", verified: true }, createdAt: sampleHoursAgo(10), text: "A forum AND a tote?? You’re spoiling us!! 🩵" }
      ]
    },
    {
      id: "sample-post-2",
      author: { displayName: "@silkgirl", verified: false },
      createdAt: sampleHoursAgo(26),
      text: "Is a slip dress too much for a Tuesday at the office? Asking for me.",
      item: null,
      likeCount: 24,
      replyCount: 12,
      replies: [
        { id: "r4", author: { displayName: "gabriela c.", verified: true }, createdAt: sampleHoursAgo(25), text: "Never too much. Oversized blazer on top and you’re done." },
        { id: "r5", author: { displayName: "@cashmere.soul", verified: false }, createdAt: sampleHoursAgo(24), text: "A chunky knit over it is my go-to." }
      ]
    },
    {
      id: "sample-post-3",
      author: { displayName: "Else C.", verified: true, official: true },
      createdAt: sampleHoursAgo(30),
      text: "Just listed: the dreamiest blue satin slip from Staud. Wedding guest season, we see you.",
      item: { id: "sample-blue-dress", brand: "Staud", title: "Satin Slip Dress", price: 195, currency: "USD", photoUrl: "img/sample/blue-dress.jpg", sold: false },
      likeCount: 9,
      replyCount: 2,
      replies: [
        { id: "r6", author: { displayName: "@trenchlover", verified: false }, createdAt: sampleHoursAgo(29), text: "Okay this colour is everything." }
      ]
    }
  ],

  // GET /public/brands — the brands configured in the admin
  brands: [
    { id: "staud", name: "Staud" },
    { id: "ganni", name: "Ganni" },
    { id: "sandro", name: "Sandro" },
    { id: "zimmermann", name: "Zimmermann" },
    { id: "reformation", name: "Reformation" },
    { id: "ulla-johnson", name: "Ulla Johnson" },
    { id: "veronica-beard", name: "Veronica Beard" },
    { id: "vince", name: "Vince" },
    { id: "cult-gaia", name: "Cult Gaia" },
    { id: "house-of-cb", name: "House of CB" },
    { id: "realisation-par", name: "Réalisation Par" }
  ],

  // Showcase conversation for the "Ask else" section.
  // Written by the else team (never a real member's chat).
  // Later it can come from the admin: GET /public/ask-else-showcase,
  // with the items' price and sold state read live from the catalog.
  askElseShowcase: {
    messages: [
      { from: "member", text: "Show me bags" },
      {
        from: "else",
        text: "I found two, both in like-new condition. The Sandro suede bucket bag suits your love of Sandro, and the Staud beaded frame bag brings the playful touch you like.",
        items: [
          { id: "sample-staud-beaded", brand: "Staud", title: "Beaded Frame Bag", price: 165, currency: "USD", photoUrl: "img/sample/staud-beaded.jpg", sold: true },
          { id: "sample-sandro-bag", brand: "Sandro", title: "Suede Bucket Bag", price: 210, currency: "USD", photoUrl: "img/sample/sandro-bag.jpg", sold: false }
        ]
      },
      { from: "member", text: "Add the second one to my cart" },
      { from: "else", text: "Done! The Sandro suede bucket bag is in your cart, and it will pair nicely with your rainy day looks." }
    ]
  }
};
