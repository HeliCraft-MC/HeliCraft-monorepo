module.exports = {
    apps: [
        {
            name: 'HeliCraft-Vesper',
            exec_mode: 'cluster',
            instances: '1',
            script: './.output/server/index.mjs',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        }
    ]
}
