// background.js

import { GoogleGenerativeAI } from "@google/generative-ai";

//const API_KEY = ''; // Replace with your actual API key
const API_KEY = ''; // Replace with your actual API key
const genAI = new GoogleGenerativeAI(API_KEY);

// Initialize storage for user data
chrome.storage.local.set({ 
  productViews: {},
  cartItems: [],
  purchaseHistory: [],
  userPreferences: {
    budget: null,
    holidaySeason: null,
    preferredCategories: [],
    giftShopping: false
  }
}, () => {
  console.log("Storage initialized");
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateProductView") {
    updateProductView(request.productId, request.timeSpent, request.isLoggedIn, request.category);
  } else if (request.action === "updateCart") {
    updateCart(request.item, request.isLoggedIn);
  } else if (request.action === "recordPurchase") {
    recordPurchase(request.items, request.isLoggedIn);
  } else if (request.action === "updatePreferences") {
    updateUserPreferences(request.preferences);
  } else if (request.action === "getInsights") {
    generateInsights(request.budget, request.preferences).then(sendResponse);
    return true; // Indicates we will send a response asynchronously
  } else if (request.action === "askGemini") {
    askGemini(request.question).then(sendResponse);
    return true; 
  }
});

// Function to update user preferences
function updateUserPreferences(preferences) {
  chrome.storage.local.get("userPreferences", (data) => {
    const updatedPreferences = { ...data.userPreferences, ...preferences };
    chrome.storage.local.set({ userPreferences: updatedPreferences });
  });
}

// Function to update product view data
function updateProductView(productId, timeSpent, isLoggedIn, category) {
  chrome.storage.local.get("productViews", (data) => {
    const updatedViews = { ...data.productViews };
    if (!updatedViews[productId]) {
      updatedViews[productId] = {
        views: 0,
        totalViewTime: 0,
        categories: {}
      };
    }
    updatedViews[productId].views++;
    updatedViews[productId].totalViewTime += timeSpent;
    if (category && category.length > 0) {
      updatedViews[productId].categories[category] = (updatedViews[productId].categories[category] || 0) + 1;
    }
    chrome.storage.local.set({ productViews: updatedViews });
  });
}

// Function to update cart data (implement based on user login status)
function updateCart(item, isLoggedIn) {
  // ... (implementation based on login status - access actual cart if logged in)
}

// Function to record purchase data (implement based on user login status)
function recordPurchase(items, isLoggedIn) {
  // ... (implementation based on login status - access purchase details if logged in)
}

// Function to generate insights using Gemini API
async function generateInsights(budget, preferences) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const data = await new Promise((resolve) => {
      chrome.storage.local.get(["productViews", "cartItems", "purchaseHistory", "userPreferences"], resolve);
    });

    // Process user data
    const topCategories = getTopCategories(data.productViews); 
    // ... (add other data processing as needed)

    // Construct prompt for Gemini API
    const prompt = `Based on the following user behavior and preferences, provide shopping insights:
    Top Categories: ${topCategories.join(', ')}
    Cart Items: ${data.cartItems.length} items
    Purchase History: ${data.purchaseHistory.length} purchases
    Budget: $${budget}
    Holiday Season: ${preferences.holidaySeason ? "Yes" : "No"}
    Gift Shopping: ${preferences.giftShopping ? "Yes" : "No"}
    Preferred Category: ${preferences.preferredCategories.join(', ')}
    
    Please provide:
    1. Top 3 product categories the user is interested in (excluding preferred category if provided)
    2. A budget recommendation (considering the user's budget)
    3. A product suggestion within the given budget
    4. Holiday-specific recommendations (if applicable)
    5. Gift suggestions (if user is gift shopping)`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the generated text to extract insights
    const insights = parseInsights(text);

    return { insights: insights };
  } catch (error) {
    console.error("Error generating insights:", error);
    return { error: error.message };
  }
}


// Function to extract top categories based on user views
function getTopCategories(productViews) {
  const categoryCounts = {};
  let totalViews = 0;

  for (const productId in productViews) {
    if (productViews.hasOwnProperty(productId)) {
      totalViews += productViews[productId].views;

      // Count categories for each product
      for (const category in productViews[productId].categories) {
        if (productViews[productId].categories.hasOwnProperty(category)) {
          categoryCounts[category] = (categoryCounts[category] || 0) + productViews[productId].categories[category];
        }
      }
    }
  }

  // Sort categories by count in descending order
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // Calculate threshold for top categories (e.g., top 3)
  const topCategoryCount = Math.min(3, sortedCategories.length);

  // Return the top categories
  return sortedCategories.slice(0, topCategoryCount);
}

// Helper function to parse insights from generated text
function parseInsights(text) {
  const lines = text.split('\n');
  return {
    topCategories: lines[0].split(':')[1].trim().split(', '),
    budgetRecommendation: lines[1].split(':')[1].trim(),
    productSuggestion: lines[2].split(':')[1].trim(),
    holidayRecommendation: lines[3].split(':')[1].trim(),
    giftSuggestion: lines[4].split(':')[1].trim()
  };
}

// Function to ask Gemini for general question
async function askGemini(question) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Please answer the following question: ${question}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return { answer: text };
  } catch (error) {
    console.error("Error asking Gemini:", error);
    return { error: error.message };
  }
}

