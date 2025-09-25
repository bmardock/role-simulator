# Leadership Simulator

A browser-based leadership simulation game where you make decisions as an engineering manager and see the consequences of your choices.

## Play the Game

The game is deployed on GitHub Pages: [Play Now](https://bmardock.github.io/role-simulator/)

## How to Play

1. **Choose Your Leadership Style**: Select from different leadership archetypes (Operator, Servant Leader, Visionary, Firefighter)
2. **Pick Your Company**: Choose between Startup, Scaleup, or BigCo environments
3. **Make Decisions**: Each turn, roll dice to determine your situation, then make choices that affect your team and company
4. **See Consequences**: Watch how your decisions impact various metrics like team morale, velocity, trust, and more

## Features

- **Dynamic Scenarios**: AI-generated scenarios that adapt to your leadership style and company context
- **Realistic Tradeoffs**: Every decision has both positive and negative consequences
- **Multiple Archetypes**: Different leadership styles with unique strengths and challenges
- **Company Progression**: Advance from startup to scaleup to big company
- **Persistent State**: Your game progress is automatically saved

## Development

### Local Development

To run locally with the full backend:

```bash
npm install
npm start
```

The game will be available at `http://localhost:8787`

### GitHub Pages Deployment

The game is automatically deployed to GitHub Pages when you push to the main branch. The deployment uses a mock API service that works entirely in the browser, so no backend server is required.

### Project Structure

- `index.html` - Main game interface
- `script.js` - Core game logic and state management
- `scenarioService.js` - Backend API service (for local development)
- `api-mock.js` - Mock API service (for GitHub Pages deployment)
- `style.css` - Game styling
- `server.js` - Express backend server (for local development)
- `deck.json` - Static scenario data (optional)
- `milestones.json` - Game progression rules

## Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js, Express (local development only)
- **AI**: OpenAI GPT-4 for dynamic scenario generation
- **Deployment**: GitHub Pages with GitHub Actions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your own leadership training or educational purposes.