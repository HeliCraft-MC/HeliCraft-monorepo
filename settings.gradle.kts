rootProject.name = "helicraft"
include("deneb", "rigel")
project(":deneb").projectDir = file("apps/deneb")
project(":rigel").projectDir = file("apps/rigel")
include("minecraft-client")
project(":minecraft-client").projectDir = file("packages/minecraft-client")
