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
  "1419951542705979473",
  "1419951541669990480"

];

// Check if user is allowed to use /dmall
function canUseDmall(interaction) {
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

  if (interaction.commandName === "dmall") {
    // Permission check (only specific roles can use this)
    if (!canUseDmall(interaction)) {
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

    // initial reply so the interaction doesn’t time out
    await interaction.reply({
      content:
        "Starting to dm.",
      ephemeral: true
    });

    try {
      // fetch all members so we can filter by roles
      await guild.members.fetch();

      // filter: non-bot members who have ANY of the target roles
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
          // finished
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

        // personalisation tokens
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

      // start loop
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
});

client.login(process.env.DISCORD_TOKEN);
