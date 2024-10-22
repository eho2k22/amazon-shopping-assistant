// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const chatContainer = document.getElementById('chat-container');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const budgetInput = document.getElementById('budget-input');
  const categoryInput = document.getElementById('category-input');
  const holidayInput = document.getElementById('holiday-input');
  const giftInput = document.getElementById('gift-input');

  let budget = null;
  let preferences = {};

  function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;
    messageElement.textContent = message;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function askQuestion(question) {
    addMessage('bot', question);
  }

  function handleUserInput() {
    const userMessage = userInput.value.trim();
    if (userMessage) {
      addMessage('user', userMessage);
      userInput.value = '';
      
      // Check if the user is asking a question
      if (userMessage.endsWith('?') || userMessage.toLowerCase().startsWith('what')) {
        askGemini(userMessage);
      } else {
        processUserInput(userMessage); // Handle budget and preferences
      }
    }
  }
  
  // Function to ask Gemini for general question
  function askGemini(question) {
    addMessage('bot', "Thinking...");
    chrome.runtime.sendMessage({action: "askGemini", question: question}, (response) => {
      if (response.answer) {
        addMessage('bot', response.answer);
      } else if (response.error) {
        addMessage('bot', `Sorry, there was an error: ${response.error}`);
      }
    });
  }

  function processUserInput(input) {
    if (budget === null) {
      const parsedBudget = parseFloat(input);
      if (!isNaN(parsedBudget) && parsedBudget > 0) {
        budget = parsedBudget;
        addMessage('bot', `Great! I've set your shopping budget to $${budget.toFixed(2)}.`);
        askForPreferences();
      } else {
        addMessage('bot', "I'm sorry, I couldn't understand that. Please enter a valid number for your budget.");
      }
    }
  }

  function askForPreferences() {
    addMessage('bot', "Now, tell me about your shopping preferences:");
    addMessage('bot', "1. Enter a preferred category (e.g., 'Electronics', 'Books', etc.)");
    addMessage('bot', "2. Are you shopping for a holiday? (yes/no)");
    addMessage('bot', "3. Are you gift shopping? (yes/no)");
  }

  function handlePreferenceInput() {
    const category = categoryInput.value.trim();
    const holiday = holidayInput.value.trim().toLowerCase();
    const gift = giftInput.value.trim().toLowerCase();

    if (category) {
      preferences.preferredCategories = [category]; // Add to preferences object
      categoryInput.value = '';
    }

    if (holiday === 'yes' || holiday === 'no') {
      preferences.holidaySeason = holiday === 'yes' ? true : false;
      holidayInput.value = '';
    }

    if (gift === 'yes' || gift === 'no') {
      preferences.giftShopping = gift === 'yes' ? true : false;
      giftInput.value = '';
    }

    if (category || holiday || gift) {
      addMessage('bot', "Thanks! I've updated your preferences.");
      askForInsights();
    } else {
      addMessage('bot', "Please provide at least one preference.");
    }
  }

  function askForInsights() {
    addMessage('bot', "I'll now generate some shopping insights based on your preferences. Please wait...");
    chrome.runtime.sendMessage({action: "getInsights", budget: budget, preferences: preferences}, (response) => {
      if (response.insights) {
        displayInsights(response.insights);
      } else if (response.error) {
        addMessage('bot', `Sorry, there was an error: ${response.error}`);
      }
    });
  }

  function displayInsights(insights) {
    addMessage('bot', `Top categories: ${insights.topCategories.join(', ')}`);
    addMessage('bot', `Budget recommendation: ${insights.budgetRecommendation}`);
    addMessage('bot', `Product suggestion: ${insights.productSuggestion}`);
    // ... (display other insights as needed)
  }

  sendButton.addEventListener('click', handleUserInput);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleUserInput();
    }
  });

  // Start the conversation
  askQuestion("Hello! To get started, please enter your shopping budget for Amazon:");

  // Add event listeners for preference input
  categoryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handlePreferenceInput();
    }
  });
  holidayInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handlePreferenceInput();
    }
  });
  giftInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handlePreferenceInput();
    }
  });
});

