// content.js

let pageStartTime = Date.now();
let isLoggedIn = false;

// Function to check if user is logged in
function checkLoginStatus() {
  // Check if the "Hello, [username]" element exists (this might be a bit fragile)
  const accountElement = document.querySelector('.nav-line-1-container > span:first-child'); 
  isLoggedIn = accountElement && accountElement.textContent.includes('Hello,'); 
  return isLoggedIn;
}

// Function to get product ID 
function getProductId() {
  const productIdElement = document.querySelector('#productTitle');
  if (productIdElement) {
    // Extract the product ID from the URL or the DOM
    const url = new URL(window.location.href);
    const productId = url.searchParams.get('pd_rd_i'); // Example: Using a URL parameter
    if (!productId) {
      // Alternative: Try to extract the ID from the DOM
      // ... (Your logic to get the ID from the product title element or other DOM elements)
    }
    return productId;
  }
  return null; 
}

// Function to get product category
function getCategory() {
  // Try to find the category element (this might be fragile)
  const categoryElement = document.querySelector('#wayfinding-breadcrumbs_feature_div > ul > li:nth-child(2) > a'); 
  if (categoryElement) {
    return categoryElement.textContent.trim(); 
  }
  return null; 
}

// Function to get product details
function getProductDetails() {
  const productTitleElement = document.querySelector('#productTitle');
  const priceElement = document.querySelector('#priceblock_ourprice');
  const imageElement = document.querySelector('#imgTagWrapperId img');
  const ratingElement = document.querySelector('#acrCustomerReviewText');

  return {
    title: productTitleElement ? productTitleElement.textContent.trim() : null,
    price: priceElement ? priceElement.textContent.trim() : null,
    image: imageElement ? imageElement.src : null,
    rating: ratingElement ? ratingElement.textContent.trim() : null
  };
}

// ... (Rest of your content.js code)
// Function to track page view
function trackPageView() {
  const productId = getProductId();
  if (productId) {
    const timeSpent = (Date.now() - pageStartTime) / 1000; // Convert to seconds
    const category = getCategory();
    chrome.runtime.sendMessage({
      action: "updateProductView",
      productId: productId,
      timeSpent: timeSpent,
      isLoggedIn: isLoggedIn,
      category: category // Send category information
    });
  }
}

// Function to handle add to cart action
function handleAddToCart() {
  const item = getProductDetails();
  if (isLoggedIn) {
    // When logged in, we can access and track the actual cart
    chrome.runtime.sendMessage({
      action: "updateCart",
      item: item,
      isLoggedIn: true
    });
  } else {
    // When not logged in, we can only track the action, not the actual cart state
    chrome.runtime.sendMessage({
      action: "trackAddToCartAttempt",
      item: item,
      isLoggedIn: false
    });
  }
}

// Function to handle purchase
function handlePurchase() {
  if (isLoggedIn) {
    // When logged in, we can access purchase details
    const purchasedItems = getPurchasedItems(); // Implement this function
    chrome.runtime.sendMessage({
      action: "recordPurchase",
      items: purchasedItems,
      isLoggedIn: true
    });
  } else {
    // When not logged in, we can only track that a purchase occurred
    chrome.runtime.sendMessage({
      action: "trackPurchaseAttempt",
      isLoggedIn: false
    });
  }
}

// Initialize and set up event listeners
function initialize() {
  checkLoginStatus();

  // Listen for add to cart button clicks
  document.addEventListener('click', (event) => {
    if (event.target.id === 'add-to-cart-button') {
      handleAddToCart();
    }
  });

  // Check for order confirmation page
  if (window.location.pathname.includes('/gp/buy/thankyou')) {
    handlePurchase();
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "trackPageView") {
    trackPageView();
  }
});

// Run initialization
initialize();

/*
Data accessibility based on login status:

When Logged In:
- Full access to user's Amazon account information
- Can track actual cart contents and changes
- Can access and record detailed purchase history
- Can access user's wishlist and saved items
- Can potentially access user's browsing history on Amazon

When Not Logged In:
- Limited to current session data only
- Can track product views and time spent on pages
- Can detect add-to-cart attempts, but can't access actual cart contents
- Can detect that a purchase occurred, but can't access purchase details
- No access to user-specific data like wishlists or account history

In both cases:
- Can access and track general browsing behavior on Amazon (pages visited, time spent)
- Can access publicly visible product information
- Can detect interactions with page elements (like clicking buttons)

Note: Always respect user privacy and Amazon's terms of service. This extension
should only collect and use data that is necessary for its functionality and
that users have explicitly agreed to share.
*/

