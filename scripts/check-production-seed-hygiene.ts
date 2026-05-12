import prisma from "@/lib/prisma";

async function main() {
  const reviewUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: "review.",
      },
    },
    select: {
      email: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  if (reviewUsers.length > 0) {
    console.error("FAIL production seed hygiene: deterministic review users are present in production-style data.");
    for (const user of reviewUsers) {
      console.error(`- ${user.email}`);
    }
    process.exit(1);
  }

  console.log("PASS production seed hygiene: no deterministic review users found.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
