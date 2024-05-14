document.addEventListener('DOMContentLoaded', () => {
  const entriesContainer = document.getElementById('entries');
  const addButton = document.getElementById('addButton');
  const bulkExtendButton = document.getElementById('bulkExtendButton');
  const entryTemplate = document.getElementById('entryTemplate').content;

  // Load entries from local storage
  loadEntries();

  // Add new entry
  addButton.addEventListener('click', () => {
    const entryText = prompt('Enter new text:');
    if (entryText) {
      addEntry(entryText);
      saveEntries();
    }
  });

  // Bulk extend entries
  bulkExtendButton.addEventListener('click', () => {
    const selectedEntries = Array.from(entriesContainer.querySelectorAll('.entryCheckbox:checked'))
      .map(checkbox => checkbox.nextElementSibling.textContent);
    if (selectedEntries.length > 0) {
      extendSearchURL(selectedEntries.join(' AND '));
    } else {
      alert('No entries selected.');
    }
  });

  function loadEntries() {
    // Clear existing entries to prevent duplicates
    entriesContainer.innerHTML = '';

    const entries = JSON.parse(localStorage.getItem('textEntries')) || [];
    entries.forEach(entryText => {
      addEntry(entryText);
    });
  }

  function saveEntries() {
    const entries = Array.from(entriesContainer.children).map(li => li.querySelector('.text').textContent);
    localStorage.setItem('textEntries', JSON.stringify(entries));
  }

  function addEntry(text) {
    const entryElement = document.importNode(entryTemplate, true);
    const checkbox = entryElement.querySelector('.entryCheckbox');
    const textElement = entryElement.querySelector('.text');
    const editButton = entryElement.querySelector('.editButton');
    const deleteButton = entryElement.querySelector('.deleteButton');
    const extendButton = entryElement.querySelector('.extendButton');

    textElement.textContent = text;

    editButton.addEventListener('click', () => {
      const newText = prompt('Edit text:', textElement.textContent);
      if (newText !== null) {
        textElement.textContent = newText;
        saveEntries();
      }
    });

    deleteButton.addEventListener('click', () => {
      entriesContainer.removeChild(deleteButton.closest('li'));
      saveEntries();
    });

    extendButton.addEventListener('click', () => {
      extendSearchURL(textElement.textContent);
    });

    entriesContainer.appendChild(entryElement);
  }

  function extendSearchURL(queryText) {
    console.log('Extend button clicked with text:', queryText);

    // Get the current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error('Error: No active tab found.');
        alert('Error: No active tab found.');
        return;
      }

      const tab = tabs[0];
      if (!tab || !tab.url) {
        console.error('Error: Unable to access the current tab URL.');
        alert('Error: Unable to access the current tab URL.');
        return;
      }

      const kibanaURL = tab.url;

      console.log('Current Kibana URL:', kibanaURL);

      // Ensure it's a Kibana URL
      if (!kibanaURL.includes('kibana')) {
        console.error('Error: The current tab is not a Kibana URL.');
        alert('Error: The current tab is not a Kibana URL.');
        return;
      }

      try {
        // Extract the _a parameter
        const url = new URL(kibanaURL);
        const params = new URLSearchParams(url.hash.slice(1));
        const aParam = params.get('_a');

        if (!aParam) {
          console.error('Error: _a parameter not found in the Kibana URL.');
          alert('Error: _a parameter not found in the Kibana URL.');
          return;
        }

        console.log('Original _a parameter:', aParam);

        // Decode the _a parameter using Rison
        let aObj;
        try {
          aObj = rison.decode(aParam);
        } catch (error) {
          console.error('Failed to decode _a parameter:', error);
          alert('Error: Failed to decode the _a parameter.');
          return;
        }

        console.log('Decoded _a parameter:', aObj);

        // Modify the query part
        if (aObj.query && aObj.query.query) {
          aObj.query.query += ` AND ${queryText}`;
        } else {
          aObj.query = { language: "lucene", query: queryText };
        }

        console.log('Modified _a parameter:', aObj);

        // Encode the modified object back to Rison
        let newAParam;
        try {
          newAParam = rison.encode(aObj);
        } catch (error) {
          console.error('Failed to encode _a parameter:', error);
          alert('Error: Failed to encode the _a parameter.');
          return;
        }

        params.set('_a', newAParam);
        url.hash = `#/?${params.toString()}`;  // Correctly set the hash part

        console.log('New URL:', url.toString());

        // Open the new URL
        window.open(url.toString(), '_blank');
      } catch (error) {
        console.error('Failed to parse the Kibana URL:', error);
        alert('Error: Failed to parse the Kibana URL.');
      }
    });
  }
});
