package io.helicraft.rigel;

import io.helicraft.minecraft.ApiModels.Admission;
import io.helicraft.minecraft.ApiModels.Challenge;
import io.helicraft.minecraft.ApiModels.Proof;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/** One connection owns one challenge and can consume it only once. */
final class AuthAttempt {
  final Challenge challenge;
  final Proof proof;
  final AtomicBoolean busy = new AtomicBoolean();
  private volatile Admission admission;
  private volatile boolean closed;

  AuthAttempt(Challenge challenge, UUID connectionId) {
    this.challenge = challenge;
    proof = new Proof(connectionId, challenge.verifier());
  }

  synchronized boolean admit(Admission value) {
    if (closed
        || admission != null
        || value == null
        || !value.session().valid()
        || !value.session().accountId().equals(challenge.accountId())
        || !value.session().username().equals(challenge.username())) {
      return false;
    }
    admission = value;
    return true;
  }

  synchronized boolean close() {
    if (closed) {
      return false;
    }
    closed = true;
    return true;
  }

  boolean closed() {
    return closed;
  }

  Admission admission() {
    return admission;
  }

  boolean authenticated() {
    return !closed && admission != null && admission.session().valid();
  }

  boolean expired() {
    return !Instant.parse(challenge.expiresAt()).isAfter(Instant.now());
  }

  synchronized void refreshed(Admission value) {
    if (!closed
        && admission != null
        && value != null
        && value.session().id().equals(admission.session().id())
        && value.session().accountId().equals(challenge.accountId())) {
      admission = value;
    }
  }
}
