if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP server listening on port ${PORT}`);
});


const RENDER_URL = "https://bot-dm.onrender.com/"; 

setInterval(() => {
  fetch(RENDER_URL)
    .then(res => {
      console.log("Keepalive ping OK:", res.status);
    })
    .catch(err => {
      console.error("Keepalive ping failed:", err.message);
    });
}, 5 * 60 * 1000); 


const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers   // needed to fetch all members and roles
  ],
  partials: [Partials.Channel]
});

const OWNER_IDS = [
  "202820904617639936"
];
const LOG_CHANNEL_ID = "1440110872503779431";

const ALLOWED_SENDER_ROLE_IDS = [
  "1419559076622241863",
  "1420478167780687935"
];

const TARGET_ROLE_IDS = [
// LR
  "1419951563111141496",
  "1419951561114783755",
  "1419951560116666489",
  "1419951559110033429",

  // MR
  "1419951556744315001",
  "1419951555632955463",
  "1419951554357887078",
  "1419951551916675212",
  "1419951550939533332",
  // NCO
  "1419951549278584882",
  "1419951547135037522",
  "1419951545558241290",
  "1419951544710987867",
  "1419951543876059226",
  // ELITE
  "1438551355143753818",
  "1419951542705979473",
  "1419951541669990480",
  "1419951540768083999",

  // HC
  "1427151958111813832",
  "1427152083043487828",
  "1419951539191152793",
  "1427152451055910993",
  "1419951538247303251",
  // CONSCRIPTS
  "1419951564013047848"

];

// Check if user is allowed to use /dmall
function canUseAdminCommands(interaction) {
  if (!interaction.inGuild()) return false;

  // owner override
  if (OWNER_IDS.includes(interaction.user.id)) return true;

  const member = interaction.member;
  if (!member) return false;

  // must have at least one of the allowed sender roles
  const hasAllowedRole = member.roles.cache.some(role =>
    ALLOWED_SENDER_ROLE_IDS.includes(role.id)
  );

  return hasAllowedRole;
}

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});




client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // ============= /dmall =============
  if (interaction.commandName === "dmall") {
    if (!canUseAdminCommands(interaction)) {
      return interaction.reply({
        content: "You don’t have permission to use this command.",
        ephemeral: true
      });
    }

    const dmTextRaw = interaction.options.getString("message", true).trim();

    if (!dmTextRaw) {
      return interaction.reply({
        content: "Message cannot be empty.",
        ephemeral: true
      });
    }

    const guild = interaction.guild;

    await interaction.reply({
      content: "Starting to dm.",
      ephemeral: true
    });

    try {
      await guild.members.fetch();

      const members = guild.members.cache.filter(m => {
        if (m.user.bot) return false;
        return m.roles.cache.some(role =>
          TARGET_ROLE_IDS.includes(role.id)
        );
      });

      const membersArray = Array.from(members.values());
      let successCount = 0;
      let failCount = 0;
      let index = 0;

      const delayMs = 2000; // 2 seconds between DMs; increase if needed

      const sendNext = async () => {
        if (index >= membersArray.length) {
          try {
            await interaction.followUp({
              content:
                `Finished.\n` +
                `Success: **${successCount}**\nFailed: **${failCount}**`,
              ephemeral: true
            });
          } catch (e) {
            console.error("Error sending final follow-up:", e);
          }
          return;
        }

        const member = membersArray[index];
        index++;

        const dmText = dmTextRaw
          .replace(/\{user\}/g, member.user.username)
          .replace(/\{mention\}/g, `<@${member.id}>`);

        try {
          await member.send(dmText);
          successCount++;
          console.log(`DM sent to ${member.user.tag}`);
        } catch (err) {
          failCount++;
          console.log(`Failed to DM ${member.user.tag}: ${err.message}`);
        }

        setTimeout(sendNext, delayMs);
      };

      sendNext();

    } catch (err) {
      console.error(err);
      try {
        await interaction.followUp({
          content: "Something went wrong while fetching members or sending DMs.",
          ephemeral: true
        });
      } catch (e2) {
        console.error("Error sending error follow-up:", e2);
      }
    }
  }

  // ============= /status =============
  else if (interaction.commandName === "status") {
    if (!canUseAdminCommands(interaction)) {
      return interaction.reply({
        content: "You don’t have permission to use this command.",
        ephemeral: true
      });
    }

    const NOTIFY_ROLE_ID = "1419559076622241863";
    const guild = interaction.guild;

    await interaction.reply({
      content: "Sending status DM to the notify role...",
      ephemeral: true
    });

    try {
      await guild.members.fetch();

      const targets = guild.members.cache.filter(m => {
        if (m.user.bot) return false;
        return m.roles.cache.has(NOTIFY_ROLE_ID);
      });

      if (targets.size === 0) {
        return interaction.followUp({
          content: "No members found with the notify role. Make sure it’s assigned to you.",
          ephemeral: true
        });
      }

      const statusMessage = "APEX Automation is online.";

      let successCount = 0;
      let failCount = 0;

      for (const member of targets.values()) {
        try {
          await member.send(statusMessage);
          successCount++;
          console.log(`Status DM sent to ${member.user.tag}`);
        } catch (err) {
          failCount++;
          console.warn(`Failed to send status DM to ${member.user.tag}: ${err.message}`);
        }
      }

      await interaction.followUp({
        content:
          `Status DMs sent.\nSuccess: **${successCount}**\nFailed: **${failCount}**`,
        ephemeral: true
      });

    } catch (err) {
      console.error("Error in /status:", err);
      try {
        await interaction.followUp({
          content: "Something went wrong.",
          ephemeral: true
        });
      } catch (e2) {
        console.error("Error sending /status error follow-up:", e2);
      }
    }
  }

  // ============= /talk =============
  else if (interaction.commandName === "talk") {
    if (!canUseAdminCommands(interaction)) {
      return interaction.reply({
        content: "You don’t have permission to use this command.",
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser("user", true);
    const messageText = interaction.options.getString("message", true).trim();

    if (!messageText) {
      return interaction.reply({
        content: "Message cannot be empty.",
        ephemeral: true
      });
    }

    // Optional: prevent DMing other bots
    if (targetUser.bot) {
      return interaction.reply({
        content: "I’m not going to DM another bot.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: `Attempting to DM <@${targetUser.id}>...`,
      ephemeral: true
    });

    try {
      await targetUser.send(messageText);
      console.log(`Talk DM sent to ${targetUser.tag}`);

      await interaction.followUp({
        content: `DM'd <@${targetUser.id}>.`,
        ephemeral: true
      });
    } catch (err) {
      console.error(`Failed to DM ${targetUser.tag}:`, err);
      await interaction.followUp({
        content: `❌ Failed to DM <@${targetUser.id}>. They might have DMs disabled or blocked the bot.`,
        ephemeral: true
      });
    }
  }
});




// logs messages
client.on(Events.MessageCreate, async (message) => {
  // Ignore our own messages and other bots
  if (message.author.bot) return;

  
  if (message.guild) return;

  
  let logChannel;
  try {
    logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
  } catch (err) {
    console.error("Failed to fetch log channel:", err);
    return;
  }

  if (!logChannel || !logChannel.isTextBased()) {
    console.error("Log channel is missing or not text-based.");
    return;
  }

  // Build a simple log message
  const contentPreview =
    message.content && message.content.length > 1900
      ? message.content.slice(0, 1900) + "…"
      : (message.content || "*no text (attachments only)*");

  await logChannel.send({
    content:
      `DM\n` +
      `From: **${message.author.tag}** (\`${message.author.id}\`)\n` +
      `Time: <t:${Math.floor(message.createdTimestamp / 1000)}:f>\n\n` +
      `**Message:**\n${contentPreview}`
  }).catch(err => {
    console.error("Failed to send DM log message:", err);
  });
});



client.login(process.env.DISCORD_TOKEN);
