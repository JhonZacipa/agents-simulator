# DT-DSD Agent Simulator

Simulador interactivo de control de formaciones multi-agente basado en el algoritmo de **Dinamica de Smith Distribuida en Tiempo Discreto (DT-DSD)**. Ejecutable directamente desde el navegador sin instalacion.

**Demo en vivo:** https://jhonzacipa.github.io/agents-simulator/

---

## Descripcion

El simulador presenta 5 agentes autonomos que se coordinan de forma distribuida para alcanzar una formacion geometrica objetivo. Cada agente aplica un controlador PID de bajo nivel para moverse hacia su posicion de referencia, mientras que el algoritmo DT-DSD computa dichas referencias mediante consenso distribuido en la red de comunicacion.

El proyecto es una version web del simulador de escritorio original desarrollado en Python/PyQt5, portado integramente a HTML, CSS y JavaScript sin dependencias externas.

---

## Caracteristicas

- Tres formaciones disponibles: linea vertical, triangulo y pentagono.
- Topologia de red editable: cada enlace de comunicacion entre agentes puede activarse o desactivarse haciendo clic sobre la arista correspondiente en el grafo.
- Fisica de colisiones entre agentes resuelta en cada paso de simulacion.
- Visualizacion en tiempo real sobre canvas HTML5.
- Interfaz con diseno glass morphism.

---

## Uso

1. Abrir la demo en https://jhonzacipa.github.io/agents-simulator/
2. Seleccionar la formacion deseada en el panel izquierdo.
3. Opcionalmente, modificar la topologia de red haciendo clic en los enlaces del grafo.
4. Presionar **Start** para iniciar la simulacion.
5. Presionar **Restart** para reiniciar al estado inicial.

---

## Estructura del proyecto

```
index.html
css/
    styles.css          Estilos glass morphism
js/
    math_utils.js       Operaciones matriciales y utilidades de angulos
    formations.js       Generador de formaciones (lider + deltas seguidores)
    controller.js       Algoritmo DT-DSD (port de Python/NumPy)
    agents.js           Dinamica de agentes y resolucion de colisiones
    simulator.js        Motor de simulacion con requestAnimationFrame
    app.js              Logica de interfaz, canvas renderer y grafo SVG
images/
    vertical_line.png
    triangle.png
    pentagon.png
```

---

## Algoritmo

El controlador **DT-DSD** es un algoritmo de optimizacion distribuida en tiempo discreto con saturacion. Cada agente actualiza su estado mediante:

```
x(t+1) = x(t) + E * L(x, f) * f(x, u)
```

donde `E` es la matriz de paso, `L` es el Laplaciano modulado y `f` es el vector de aptitud que depende de la posicion del agente lider y los desplazamientos deseados de los seguidores.

El controlador de bajo nivel aplica ganancias proporcionales sobre el error de posicion y orientacion:

```
v = kp_v * distancia
w = kp_w * error_angulo
```

---

## Parametros de simulacion

| Parametro                | Valor        |
|--------------------------|--------------|
| Numero de agentes        | 5            |
| Espacio de simulacion    | 351 x 241 cm |
| Diametro de agente       | 12 cm        |
| Velocidad lineal maxima  | 15 cm/s      |
| Velocidad angular maxima | 7 rad/s      |
| Paso de tiempo           | 0.1 s        |
| Pasos maximos            | 350          |

---

## Creditos

Algoritmo DT-DSD: Juan Martinez-Piazuelo
Simulador original (Python/PyQt5): Manuel Rios
Version web: JhonZacipa
