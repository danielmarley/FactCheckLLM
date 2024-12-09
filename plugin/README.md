# FactCheckLLM Plugin
## Project Structure
- **manifest.json**
  - Defines extension metadata, permissions, and entry points
  - Essential for browser compatibility and user security; Chrome requirement for installing a plugin

- **hello.html**
  - Displayed when the user clicks the extension icon

- **background.js**
  - Runs in the background, handling browser events and data 
  - Listens for actions from the context menu
  - Messages events/responses to `content.js` for then manipulating the open tab's content 
    - Cannot directly interact with the open window itself

- **content.js**
  - Injected into specified web pages to access and modify page content
  - Listens to events from the background script to then update the UI

## How to Install to Chrome
- Navigate to chrome://extensions
- Enable `developer mode` in the top right
- Click `Load Unpacked`
- Select the `plugin/` folder
- Should then have the FactCheckLLM Plugin enabled locally