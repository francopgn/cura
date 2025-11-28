document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('idCard');

    // --- Lógica de Giro de la Tarjeta ---
    card.addEventListener('click', () => {
        card.classList.toggle('is-flipped');
    });

    // --- Generación de Datos Aleatorios ---

    // Listas de datos de ejemplo
    const nombres = ["Elisa", "Juan", "María", "Carlos", "Ana", "Pedro", "Laura", "Diego"];
    const apellidos = ["Ramirez", "González", "López", "Martínez", "Pérez", "García", "Sánchez", "Díaz"];
    const ciudades = ["General Rodríguez", "CABA", "La Plata", "Córdoba", "Rosario", "Mendoza", "San Miguel de Tucumán"];
    const provincias = ["Buenos Aires", "Córdoba", "Santa Fe", "Mendoza", "Tucumán"];
    const alergiasLista = ["PENICILINA", "LATEX", "POLEN", "ACAROS", "NÍQUEL", "SULFAS"];
    const medicamentosLista = ["ENALAPRIL", "METFORMINA", "IBUPROFENO", "LEVOTIROXINA", "ATORVASTATINA"];
    const operacionesLista = ["APENDICECTOMÍA", "CESÁREA", "VESÍCULA", "BOMBA DE MORFINA", "PRÓTESIS DE RODILLA"];
    const antecedentesLista = ["HIPERTENSIÓN", "DIABETES TIPO 2", "ASMA", "HIPOTIROIDISMO"];
    const tiposSangre = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

    // Funciones auxiliares
    const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    const generateDNI = () => {
        const num = getRandomNumber(10000000, 99999999).toString();
        return `${num.slice(0, 2)}.${num.slice(2, 5)}.${num.slice(5)}`;
    };

    const generateDateOfBirth = () => {
        const day = getRandomNumber(1, 28);
        const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        const month = getRandomItem(months);
        const year = getRandomNumber(1950, 2005);
        return `${day} ${month} ${year}`;
    };

    const generatePhones = () => {
        const count = getRandomNumber(1, 3);
        let phones = [];
        for (let i = 0; i < count; i++) {
            phones.push(`011 ${getRandomNumber(1000, 9999)} ${getRandomNumber(1000, 9999)}`);
        }
        return phones.join('<br>');
    };

    const generateList = (sourceList, emptyText, maxItems = 1) => {
        if (Math.random() > 0.7) return emptyText; // 30% de probabilidad de estar vacío
        const count = getRandomNumber(1, maxItems);
        let items = [];
        let tempSource = [...sourceList];
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * tempSource.length);
            items.push(tempSource.splice(randomIndex, 1)[0]);
            if (tempSource.length === 0) break;
        }
        return items.join('<br>');
    };

    // Generar y asignar datos
    const nombre = getRandomItem(nombres);
    const apellido = getRandomItem(apellidos);
    const fullName = `${nombre} ${apellido}`;
    const dni = generateDNI();

    // Frente
    document.getElementById('fullNameFront').textContent = fullName;
    document.getElementById('dniFront').textContent = `D.N.I: ${dni}`;
    document.getElementById('bloodType').textContent = getRandomItem(tiposSangre);
    document.getElementById('alergias').innerHTML = generateList(alergiasLista, "NO REFIERE");
    document.getElementById('operaciones').innerHTML = generateList(operacionesLista, "NINGUNA", 2);
    document.getElementById('fechaNac').textContent = generateDateOfBirth();
    document.getElementById('medicamentos').innerHTML = generateList(medicamentosLista, "SIN MEDICACIÓN VITAL EN USO", 2);
    document.getElementById('domicilio').innerHTML = `${getRandomItem(ciudades)}<br>${getRandomItem(provincias)}`;
    document.getElementById('antecedentes').innerHTML = generateList(antecedentesLista, "NINGUNO", 2);
    document.getElementById('contactos').innerHTML = generatePhones();

    // Dorso
    document.getElementById('fullNameBack').textContent = fullName;
    document.getElementById('dniBack').textContent = `D.N.I: ${dni}`;
    document.getElementById('idNumber').textContent = `ID03-${dni.replace(/\./g, '')}`;

});
