const fs = require('fs');
const path = require('path');

// Configuración: Carpetas a ignorar
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.vscode'];
const IGNORE_FILES = ['.DS_Store', 'package-lock.json', 'yarn.lock'];

// Colores para la consola
const colors = {
    reset: "\x1b[0m",
    blue: "\x1b[34m",   // Directorios
    green: "\x1b[32m",  // Archivos .jsx / .js
    yellow: "\x1b[33m", // Archivos raíz importantes
    cyan: "\x1b[36m"    // Estructura visual
};

function scanDir(dir, prefix = '') {
    const name = path.basename(dir);
    if (IGNORE_DIRS.includes(name)) return;

    // Leer contenido
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    // Separar carpetas y archivos para ordenar (carpetas primero)
    const dirs = items.filter(i => i.isDirectory());
    const files = items.filter(i => !i.isDirectory() && !IGNORE_FILES.includes(i.name));
    
    const sortedItems = [...dirs, ...files];

    sortedItems.forEach((item, index) => {
        const isLast = index === sortedItems.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = isLast ? '    ' : '│   ';
        
        // Determinar color e icono
        let color = colors.reset;
        let icon = '';
        
        if (item.isDirectory()) {
            color = colors.blue;
            icon = '📁';
        } else {
            if (item.name.endsWith('.jsx')) {
                color = colors.green;
                icon = '⚛️ ';
            } else if (item.name.endsWith('.js')) {
                color = colors.yellow;
                icon = '📜';
            } else if (item.name.endsWith('.css')) {
                icon = '🎨';
            } else {
                icon = '📄';
            }
        }

        console.log(`${prefix}${colors.cyan}${connector}${colors.reset}${color}${icon} ${item.name}${colors.reset}`);

        if (item.isDirectory()) {
            scanDir(path.join(dir, item.name), prefix + childPrefix);
        }
    });
}

console.log(`\n${colors.yellow}🔥 INICIANDO ESCANEO DE ARQUITECTURA...${colors.reset}\n`);
console.log(`📦 PROYECTO: ${path.basename(process.cwd())}`);
scanDir(process.cwd());
console.log(`\n${colors.green}✅ ESCANEO COMPLETADO.${colors.reset}\n`);