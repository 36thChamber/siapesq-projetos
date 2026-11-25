import colormap from 'colormap';

const paleta_turbo: [number, number, number][] = [
    [36, 4, 44],
    [30, 78, 196],
    [36, 199, 232],
    [88, 253, 160],
    [244, 242, 104],
    [255, 142, 39],
    [250, 50, 50]
  ];

const paleta_temp = colormap({
colormap: 'jet',
nshades: 256,
format: 'rgba',
alpha: 1
})

const paleta_sal = colormap({
    colormap: 'viridis',
    nshades: 256,
    format: 'rgba',
    alpha: 1
}).reverse()

const paleta_clorofila = colormap({
    colormap: 'greens',
    nshades: 256,
    format: 'rgba',
    alpha: 1
}).reverse()

const paleta_prof = colormap({
    colormap: 'greys',
    nshades: 256,
    format: 'rgba',
    alpha: 1
})
const interpolateColor = (color1: [number, number, number], color2: [number, number, number], factor: number = 0.5): [number, number, number] => {
    return [
        Math.round(color1[0] + factor * (color2[0] - color1[0])),
        Math.round(color1[1] + factor * (color2[1] - color1[1])),
        Math.round(color1[2] + factor * (color2[2] - color1[2]))
    ];
};

export const getColorScale = (value: number, darkenFactor: number = 0.85): string => {
    const v = Math.max(0, Math.min(1, value)); // Garante que o valor esteja entre 0 e 1

    if (v === 0) {
        return 'transparent';
    }

    const steps = paleta_turbo.length - 1;
    const scaledValue = v * steps;
    const leftIndex = Math.floor(scaledValue);
    const rightIndex = Math.min(leftIndex + 1, steps);
    const factor = scaledValue - leftIndex;

    let color = interpolateColor(paleta_turbo[leftIndex], paleta_turbo[rightIndex], factor);

    // Aplicar o fator de escurecimento
    color = color.map(component => Math.round(component * darkenFactor)) as [number, number, number];

    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
};

export const colorXerelete = (value: number, darkenFactor: number = 0.85): string => {
    const v = Math.max(0, Math.min(1, value)); // Garante que o valor esteja entre 0 e 1

    if (v === 0) {
        return 'transparent';
    }
    const minValue = 0.1;
    const maxValue = 0.6;


    const steps = paleta_turbo.length - 1;
    const stepSize = (maxValue - minValue) / steps;

    let leftIndex = Math.floor((value - minValue) / stepSize);
    let rightIndex = leftIndex + 1;
    const factor = ((value - minValue) % stepSize) / stepSize;

    leftIndex = Math.max(0, Math.min(steps - 1, leftIndex));
    rightIndex = Math.max(0, Math.min(steps, rightIndex));


    let color = interpolateColor(paleta_turbo[leftIndex], paleta_turbo[rightIndex], factor);

    // Aplicar o fator de escurecimento
    color = color.map(component => Math.round(component * darkenFactor)) as [number, number, number];

    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
};


export const color_temp = (value: number, darkenFactor: number = 0.85) => {


    if (value === 9.969209968386869e+36) {
        return 'transparent';
    }
    const minValue = -1.84;
    const maxValue = 32.14;

    const steps = paleta_temp.length - 1;
    const stepSize = (maxValue - minValue) / steps;

    let leftIndex = Math.floor((value - minValue) / stepSize);
    let rightIndex = leftIndex + 1;
    const factor = ((value - minValue) % stepSize) / stepSize;

    leftIndex = Math.max(0, Math.min(steps - 1, leftIndex));
    rightIndex = Math.max(0, Math.min(steps, rightIndex));

    let color = interpolateColor(
        paleta_temp[leftIndex],
        paleta_temp[rightIndex],
        factor
    );

    color = color.map(component => Math.round(component * darkenFactor)) as [number, number, number];

    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
}

export const color_sal = (value: number, darkenFactor: number = 0.85) => {
    if (value === 9.969209968386869e+36) {
        return 'transparent';
    }

    const minValue = 30;
    const maxValue = 37;

    const steps = paleta_sal.length - 1;
    const stepSize = (maxValue - minValue) / steps;

    let leftIndex = Math.floor((value - minValue) / stepSize);
    let rightIndex = leftIndex + 1;
    const factor = ((value - minValue) % stepSize) / stepSize;

    leftIndex = Math.max(0, Math.min(steps - 1, leftIndex));
    rightIndex = Math.max(0, Math.min(steps, rightIndex));

    let color = interpolateColor(
        paleta_sal[leftIndex],
        paleta_sal[rightIndex],
        factor
    );

    color = color.map(component => Math.round(component * darkenFactor)) as [number, number, number];

    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
}

export const color_prof = (value: number, darkenFactor: number = 0.85) => {
    if (value === -3.3999999521443642e+38) {
        return 'transparent';
    }
    const minValue = -8345.5;
    const maxValue = 241.25;

    const steps = paleta_prof.length - 1;
    const stepSize = (maxValue - minValue) / steps;

    let leftIndex = Math.floor((value - minValue) / stepSize);
    let rightIndex = leftIndex + 1;
    const factor = ((value - minValue) % stepSize) / stepSize;

    leftIndex = Math.max(0, Math.min(steps - 1, leftIndex));
    rightIndex = Math.max(0, Math.min(steps, rightIndex));

    let color = interpolateColor(
        paleta_prof[leftIndex],
        paleta_prof[rightIndex],
        factor
    );

    color = color.map(component => Math.round(component * darkenFactor)) as [number, number, number];

    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
}

export const color_clorofila = (value: number, darkenFactor: number = 0.85) => {
    if (value === 9.969209968386869e+36) {
        return 'transparent';
    }
    const minValue = 0.1;
    const maxValue = 1.3;

    const steps = paleta_clorofila.length - 1;
    const stepSize = (maxValue - minValue) / steps;

    let leftIndex = Math.floor((value - minValue) / stepSize);
    let rightIndex = leftIndex + 1;
    const factor = ((value - minValue) % stepSize) / stepSize;

    leftIndex = Math.max(0, Math.min(steps - 1, leftIndex));
    rightIndex = Math.max(0, Math.min(steps, rightIndex));

    let color = interpolateColor(
        paleta_clorofila[leftIndex],
        paleta_clorofila[rightIndex],
        factor
    );

    color = color.map(component => Math.round(component * darkenFactor)) as [number, number, number];

    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
}

