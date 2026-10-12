# VidaLab · Sistema de turnos

Prototipo para laboratorio clínico con frontend Angular y API Flask.

## Funciones

- Genera turnos consecutivos A01, A02… y permite elegir el servicio.
- Muestra en vivo el turno que está siendo atendido y la lista de espera.
- Incluye cuatro ventanillas: cada una llama el siguiente turno disponible.
- Al finalizar una atención libera la ventanilla, reproduce un tono y muestra el estado actualizado.
- El llamado de turno se anuncia con la voz disponible en el navegador.

## Desarrollo local

Requisitos: Node.js 20.19+ y Python 3.10+.

```sh
npm install
npm start
```

En otra terminal inicia la API:

```sh
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
python -m flask --app api.index run --port 5000
```

El archivo `proxy.conf.json` dirige las solicitudes `/api` de Angular a Flask en `localhost:5000`.

## Despliegue en Vercel

El `vercel.json` configura la salida estática de Angular y enruta `/api/*` a la función Flask en `api/index.py`. Ejecuta `vercel` desde la raíz del repositorio con una sesión autenticada.

## Nota para una operación real

El estado de turnos vive en memoria y sirve para una demostración de una sola instancia. Las funciones serverless de Vercel pueden ejecutarse en instancias distintas y reiniciarse; antes de usarlo en un laboratorio real se debe conectar una base de datos persistente (por ejemplo PostgreSQL) y añadir controles de acceso para el personal. No se guarda información clínica o personal del paciente en este prototipo.