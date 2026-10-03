package io.helicraft.rigel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;
import org.junit.jupiter.api.Test;

final class IdentityTest {
  @Test
  void preservesIdentityAcrossCredentialChanges() {
    UUID id = UUID.randomUUID();
    assertEquals(id, new Identity(id, "Player").id());
    assertThrows(IllegalArgumentException.class, () -> new Identity(id, " "));
  }
}
