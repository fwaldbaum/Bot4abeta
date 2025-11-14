import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import dotenv from "dotenv";
dotenv.config();

const { Client, LocalAuth } = pkg;

// Iniciar cliente
const client = new Client({
  authStrategy: new LocalAuth(),
});

const admins = process.env.ADMINS.split(",");
let giveaways = [];

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("📱 Escanea el QR para iniciar sesión.");
});

client.on("ready", () => {
  console.log("✅ Bot conectado.");
});

// 📌 Función para enviar mensaje privado
async function enviarPrivado(numero, mensaje) {
  const chatId = numero.replace("+", "") + "@c.us";
  try {
    await client.sendMessage(chatId, mensaje);
  } catch (error) {
    console.log("❌ No se pudo enviar mensaje privado a", numero);
  }
}

// 📌 Comandos
client.on("message", async (message) => {
  if (!message.body.startsWith("/")) return;

  const args = message.body.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const author = message.from.split("@")[0];
  const isAdmin = admins.includes(author);

  // ---------------- BAN ----------------
  if (command === "ban") {
    if (!isAdmin) return message.reply("❌ No tienes permiso.");
    const number = args[0];
    const motivo = args.slice(1).join(" ") || "No especificado";

    if (!number) return message.reply("⚠️ Usa: /ban +569XXXXXX motivo");

    message.reply(`🚫 *${number} ha sido baneado.*`);

    // Notificar al usuario
    await enviarPrivado(
      number,
      `🚫 Has sido *baneado* del grupo.\n\n📌 Motivo: ${motivo}\n👮 Admin: +${author}`
    );
  }

  // ---------------- WARN ----------------
  else if (command === "warn") {
    if (!isAdmin) return message.reply("❌ No tienes permiso.");
    const number = args[0];
    const motivo = args.slice(1).join(" ") || "No especificado";

    if (!number) return message.reply("⚠️ Usa: /warn +569XXXXXX motivo");

    message.reply(`⚠️ *${number} ha sido warneado.*`);

    await enviarPrivado(
      number,
      `⚠️ Has recibido una *advertencia*.\n\n📌 Motivo: ${motivo}\n👮 Admin: +${author}`
    );
  }

  // ---------------- KICK ----------------
  else if (command === "kick") {
    if (!isAdmin) return message.reply("❌ No tienes permiso.");
    const number = args[0];

    if (!number) return message.reply("⚠️ Usa: /kick +569XXXXXX");

    message.reply(`👢 *${number} ha sido expulsado.*`);

    await enviarPrivado(
      number,
      `👢 Has sido *expulsado* del grupo.\n\n👮 Admin: +${author}`
    );
  }

  // ---------------- GIVEAWAY ----------------
  else if (command === "giveaway") {
    const premio = args.join(" ");
    if (!premio) return message.reply("🎁 Usa: /giveaway premio");

    const duracion = 1; // minutos
    const mensaje = await message.reply(
      `🎉 *GIVEAWAY INICIADO*\n\n🏆 Premio: *${premio}*\n🕒 Dura: ${duracion} minuto(s)\n\n📲 Reacciona con un emoji a este mensaje para participar.`
    );

    giveaways.push({
      premio,
      participantes: [],
      mensajeId: mensaje.id._serialized,
      chatId: message.from,
    });

    // Selección del ganador
    setTimeout(async () => {
      const g = giveaways.find((x) => x.mensajeId === mensaje.id._serialized);
      if (!g) return;

      if (g.participantes.length === 0) {
        await mensaje.reply("😢 Nadie participó.");
      } else {
        const ganador = g.participantes[Math.floor(Math.random() * g.participantes.length)];

        await mensaje.reply(
          `🏆 @${ganador.split("@")[0]} ha ganado *${g.premio}* 🎉`,
          { mentions: [ganador] }
        );

        // Mensaje privado al ganador
        await client.sendMessage(
          ganador,
          `🎉 ¡Felicidades! Ganaste el giveaway.\n\n🏆 Premio: *${g.premio}*`
        );
      }

      giveaways = giveaways.filter((x) => x.mensajeId !== mensaje.id._serialized);
    }, duracion * 60 * 1000);
  }

  // ---------------- HELP ----------------
  else if (command === "help") {
    message.reply(
      `📘 *Comandos disponibles*
/ban <número> <motivo>
/warn <número> <motivo>
/kick <número>
/giveaway <premio>
/help`
    );
  }
});

// 📌 Reacciones para giveaway
client.on("message_reaction", (reaction) => {
  const g = giveaways.find((x) => x.mensajeId === reaction.msgId._serialized);
  if (g) {
    const participante = reaction.senderId;
    if (!g.participantes.includes(participante)) {
      g.participantes.push(participante);
      console.log("Nueva participación:", participante);
    }
  }
});

client.initialize();
