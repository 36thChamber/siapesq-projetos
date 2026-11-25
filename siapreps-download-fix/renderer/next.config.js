module.exports = {
  images: {
    unoptimized: true
  },
  distDir: '../app',
  output: 'export',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.target = 'electron-renderer';
      //config.images.unoptimized = true
    }
    return config;
  }
};
