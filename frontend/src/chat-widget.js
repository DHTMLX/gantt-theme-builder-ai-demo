import { marked } from 'marked';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.es.js';
import MicroModal from 'micromodal';
import { ThemeManager } from './theme-manager';

export const initChat = ({ socket, runCommand, getTheme, getConfigs }) => {
  function applyThemeOnFly(theme) {
    let styleEl = document.getElementById('dynamic-theme');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-theme';
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = theme;
  }

  function parseFromCSSToObj(cssThemeStr) {
    const lines = cssThemeStr.split(/;|\n/);
    const vars = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const match = line.match(/^--([\w-]+)\s*:\s*(.+)$/);
      if (match) {
        const key = `--${match[1]}`;
        const value = match[2].trim();
        vars.push({ key, value });
      }
    }

    return vars;
  }

  function parseConfigStringToArray(configStr) {
    const lines = configStr.split('\n');
    const configRegex = /^gantt\.config\.(\w+)\s*=\s*(.+);$/;
    const configs = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(configRegex);
      if (match) {
        const [, name, rawValue] = match;

        let value;
        try {
          value = JSON.parse(rawValue);
        } catch {
          value = rawValue;
        }

        configs.push({ name, value });
      }
    }

    return configs;
  }

  (function () {
    const chatWidgetContainer = document.querySelector('#chat-tab');
    chatWidgetContainer.dataset.id = '0';

    chatWidgetContainer.innerHTML = `
      <div id="chat-popup" class="relative left-0 bottom-0 h-full w-full bg-white rounded-md shadow-md flex flex-col transition-all">
        <div id="chat-header" class="flex justify-between items-center p-4 bg-gray-800 text-white rounded-t-md">
          <h3 class="m-0 text-lg">DHX Assistant</h3>
           <button data-micromodal-trigger="modal-1" class="help-btn">?</button>
        </div>
        <div id="chat-messages" class="flex-1 p-4 overflow-y-auto text-base"></div>
        <div id="loader" class="hidden justify-start mb-3">
          <div class="spinner m-auto"></div>
        </div>
        <div id="chat-input-container" class="p-4 border-t border-gray-200">
          <div class="flex space-x-4 items-center">
            <input type="text" id="chat-input" class="flex-1 border border-gray-300 rounded-md px-4 py-2 outline-none w-3/4" placeholder="Type your message...">
            <button id="chat-submit" class="bg-gray-800 text-white rounded-md px-4 py-2 cursor-pointer">Send</button>
          </div>
        </div>
      </div>
    `;

    const chatInput = document.getElementById('chat-input');
    const chatSubmit = document.getElementById('chat-submit');
    const chatMessages = document.getElementById('chat-messages');
    const themeManager = new ThemeManager();
    themeManager.initEditors();

    themeManager.onThemeChange((css, configs, isSave = false) => {
      if (isSave) {
        const variables = parseFromCSSToObj(css);
        const parsedConfigs = parseConfigStringToArray(configs);
        runCommand('set_theme', { variables, configs: parsedConfigs });
      } else {
        applyThemeOnFly(css);
        const parsedConfigs = parseConfigStringToArray(configs);
        runCommand('set_configs', { configs: parsedConfigs });
      }
    });

    chatSubmit.addEventListener('click', function () {
      const message = chatInput.value.trim();
      if (!message) return;
      chatMessages.scrollTop = chatMessages.scrollHeight;
      chatInput.value = '';
      sendUserMessage(message);
    });

    chatMessages.addEventListener('click', function (event) {
      if (event.target.closest('.prompt-pill')) {
        const pillText = event.target.closest('.prompt-pill').innerText;
        sendUserMessage(pillText);
      }
    });

    chatInput.addEventListener('keyup', function (event) {
      if (event.key === 'Enter') {
        chatSubmit.click();
      }
    });

    const loader = document.getElementById('loader');

    function showLoader() {
      loader.classList.remove('hidden');
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideLoader() {
      loader.classList.add('hidden');
    }

    function sendUserMessage(message) {
      if (!message) return;
      displayUser(message);
      chatInput.value = '';

      const payload = {
        message,
        theme: getTheme(),
        configs: getConfigs(),
      };
      showLoader();
      socket.emit('user_msg', JSON.stringify(payload));
    }

    function displayUser(msg) {
      const div = document.createElement('div');
      div.className = 'flex justify-end mb-3';
      div.innerHTML = `<div class="bg-gray-800 text-white rounded-lg py-2 px-4 max-w-[70%]">${msg}</div>`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    socket.on('assistant_msg', (txt) => {
      hideLoader();
      displayReply(txt);
    });

    socket.on('tool_call', (txt) => {
      let handled = false;
      try {
        const { cmd, params } = JSON.parse(txt);

        if (cmd && cmd !== 'none') {
          const result = runCommand(cmd, params);
          hideLoader();
          onCallback(cmd, params);

          if (cmd === 'set_theme') {
            const { styles, configStr } = result;
            themeManager.setTheme(styles, configStr);
            displayReply('🎨 Your theme has been generated and applied! You can now edit it in the Code tab.');
          } else if (cmd === 'reset_theme') {
            themeManager.resetTheme();
          }
        }
        handled = true;
      } catch (e) {
        hideLoader();
        displayReply(`Something wrong had happened: ${e.message}`);
        handled = true;
      }
      if (!handled) displayReply(`Couldn't handle this: ${txt}`);
    });

    function displayReply(message) {
      const div = document.createElement('div');
      div.className = 'flex mb-3 chat-message';
      const html = DOMPurify.sanitize(marked.parse(message));
      div.innerHTML = `<div class="bg-gray-100 text-black rounded-lg py-2 px-4 max-w-[70%]">${html}</div>`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    let generatedTheme = false;
    function onCallback(cmd, params) {
      if (!generatedTheme && cmd === 'set_theme') {
        generatedTheme = true;
        displayReply(buildSuggestionsBlock(cmd));
        return;
      }
      if (generatedTheme && cmd === 'reset_theme') {
        generatedTheme = false;
        displayReply(buildSuggestionsBlock(cmd));
        return;
      }
    }

    function buildSuggestionsBlock(cmd) {
      const afterSetThemePills = [
        `Make tasks a bit lighter.`,
        `Make the current theme a bit darker.`,
        `Reset the current theme.`,
      ];
      const afterResetThemePills = [
        `Create me a relaxed and calm theme where blue and light-purple colors prevail.`,
        `I want to customise the Gantt chart theme. Create a bright and warm theme for me. Also, increase the height of the rows and bars. Make the link width 4px.`,
      ];
      const pills = cmd === 'set_theme' ? afterSetThemePills : afterResetThemePills;

      const cmdText =
        cmd === 'set_theme'
          ? 'Your theme is ready. Keep customizing it with natural language.'
          : 'Your theme is reset. Generate a new theme with natural language.';

      return `
  <p>${cmdText} Try:</p>
  <div class="suggestion-pills">
    ${pills.map((p) => `<button class="prompt-pill">${p}</button>`).join('')}
  </div>`;
    }

    displayReply(`## Welcome to the AI Project Wizard!

I can customise the Gantt chart theme, edit, or style your Gantt chart with plain-language commands.
<br/>
<br/>

Try things like:

<div class="suggestion-pills">
<button class="prompt-pill">I want to customise the Gantt chart theme. Create a bright and warm theme for me. Also, increase the height of the rows and bars. Make the link width 4px.</button>
<button class="prompt-pill">Make tasks a bit lighter.</button>
<button class="prompt-pill">Create me a relaxed and calm theme where blue and light-purple colors prevail.</button>
</div>`);
  })();

  MicroModal.init({ disableScroll: true });

  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = 'Copy'), 1000);
      });
    });
  });

  const chatTabsEl = document.querySelector('.chat_tabs');
  chatTabsEl.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn && !tabBtn.classList.contains('tab-btn-active')) {
      const activeBtn = chatTabsEl.querySelector('.tab-btn-active');
      const tabPaneShown = chatTabsEl.querySelector('.tab-pane-show');
      tabPaneShown && tabPaneShown.classList.remove('tab-pane-show');
      activeBtn.classList.remove('tab-btn-active');
      tabBtn.classList.add('tab-btn-active');

      const targetId = tabBtn.dataset.targetId;
      const tabPane = chatTabsEl.querySelector(`.tab-pane[data-id="${targetId}"]`);
      tabPane.classList.add('tab-pane-show');
    }
  });

  const modalBodyWrapper = document.querySelector('.modal__body-wrapper');
  const modalScrollTopBtn = document.getElementById('btn-scroll-top');

  modalBodyWrapper.addEventListener('scroll', () => {
    modalScrollTopBtn.style.display = modalBodyWrapper.scrollTop > 200 ? 'block' : 'none';
  });

  modalScrollTopBtn.addEventListener('click', () => {
    modalBodyWrapper.scrollTo({ top: 0, behavior: 'smooth' });
  });
};
