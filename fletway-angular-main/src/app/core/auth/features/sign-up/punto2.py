class Persona:
    def __init__(self, nombre, apellido, edad, dni, telefono, email, direccion):
        self.nombre = nombre
        self.apellido = apellido
        self.dni = dni 
        self.edad = edad
        self.telefono = telefono
        self.email = email
        self.direccion = direccion

    def __str__(self):
        return f"{self.nombre} {self.apellido}, DNI: {self.dni}, Edad: {self.edad}, Tel: {self.telefono}, Email: {self.email}, Dirección: {self.direccion}"

# --- Funciones auxiliares ---
def mostrarDni(persona):
    return persona.dni

def modificarApellido(persona, nuevo_apellido):
    persona.apellido = nuevo_apellido
    return persona

def modificarDireccion(persona, nueva_direccion):
    persona.direccion = nueva_direccion
    return persona

# --- Clase contenedora ---
class Personas:
    def __init__(self):
        self.personas=[]

    def agregarPersona(self, persona):
        self.personas.append(persona)
        return self.personas

    def mostrarPersonaPor(self, dni):
        for p in self.personas:
            if p.dni == dni:
                return p
        return None

    def modificarPersona(self, nuevoApellido, nuevaDireccion, dni):
        persona = self.mostrarPersonaPor(dni)
        if persona:
            modificarApellido(persona, nuevoApellido)
            modificarDireccion(persona, nuevaDireccion)
        else:
            print("Persona no encontrada.")
        return self.personas

    def menu(self):
        while True:
            print("\n--- Menú ---")
            print("1. Agregar Persona")
            print("2. Modificar Persona")
            print("3. Mostrar DNI")
            print("4. Listar todas las personas")
            print("5. Salir")
            opcion = input("Seleccione una opción: ")

            if opcion == "1":
                nombre = input("Nombre: ")
                apellido = input("Apellido: ")
                edad = int(input("Edad: "))
                dni = input("DNI: ")
                telefono = input("Teléfono: ")
                email = input("Email: ")
                direccion = input("Dirección: ")
                persona = Persona(nombre, apellido, edad, dni, telefono, email, direccion)
                self.agregarPersona(persona)

            elif opcion == "2":
                dni = input("Ingrese DNI de la persona a modificar: ")
                nuevoApellido = input("Nuevo apellido: ")
                nuevaDireccion = input("Nueva dirección: ")
                self.modificarPersona(nuevoApellido, nuevaDireccion, dni)

            elif opcion == "3":
                dni = input("Ingrese DNI: ")
                persona = self.mostrarPersonaPor(dni)
                if persona:
                    print("El DNI encontrado corresponde a:", mostrarDni(persona))
                else:
                    print("Persona no encontrada.")

            elif opcion == "4":
                if not self.personas:
                    print("No hay personas cargadas.")
                else:
                    for p in self.personas:
                        print(p)

            elif opcion == "5":
                break
            else:
                print("Opción no válida")
