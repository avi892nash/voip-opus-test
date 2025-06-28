# Opus Tutorial React App

A modern, interactive tutorial for learning the Opus audio codec, built with **Vite**, **React 19**, **TypeScript**, and **Tailwind CSS**.

## 🚀 Features

- **Fast Development**: Powered by Vite for lightning-fast hot module replacement
- **Modern Styling**: Tailwind CSS for utility-first, responsive design
- **Interactive Animations**: Framer Motion for smooth, engaging animations
- **Audio Visualizations**: Custom canvas animations and P5.js integrations
- **TypeScript**: Full type safety throughout the application
- **Responsive Design**: Mobile-first approach with Tailwind responsive utilities

## 🛠️ Tech Stack

- **React 19** - Latest React with concurrent features
- **Vite** - Next generation frontend tooling
- **TypeScript** - Static type checking
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Production-ready motion library
- **React Router** - Declarative routing
- **P5.js** - Creative coding library for animations

## 📦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

- **Dev Server**: `npm run dev` - Starts Vite dev server on `http://localhost:3000`
- **Build**: `npm run build` - TypeScript compilation + Vite production build
- **Preview**: `npm run preview` - Preview the production build locally
- **Lint**: `npm run lint` - ESLint code analysis

## 🎨 Project Structure

```
src/
├── components/          # React components
│   ├── AudioBasics.tsx  # Audio compression basics
│   ├── Footer.tsx       # Site footer
│   ├── Hero.tsx         # Landing hero section
│   ├── HeroAnimation.tsx # Canvas-based hero animation
│   ├── InteractiveDemo.tsx # Interactive demo placeholder
│   ├── Navbar.tsx       # Navigation component
│   ├── OpusCodec.tsx    # Opus codec explanation
│   └── P2PVoIP.tsx      # P2P VoIP section
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── App.tsx              # Main app component
├── main.tsx             # App entry point (Vite)
└── index.css            # Global styles (Tailwind)
```

## 🎯 Learning Sections

1. **Audio Basics** - Understanding audio compression fundamentals
2. **Opus Codec** - How the Opus codec works step-by-step
3. **Interactive Demo** - Hands-on audio compression playground
4. **P2P VoIP** - Building peer-to-peer voice applications

## 🔧 Configuration

### Tailwind CSS

Custom theme configuration in `tailwind.config.js`:
- Primary colors: Blue gradient (`#667eea` to `#764ba2`)
- Custom animations and utilities
- Extended spacing and typography

### Vite

Configuration in `vite.config.ts`:
- React plugin for JSX support
- Development server on port 3000
- Build output to `build/` directory

## 📝 License

This project is for educational purposes. See individual component licenses for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
